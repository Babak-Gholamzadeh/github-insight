import { useEffect, useState } from 'react';
import PullRequestItem from './PullRequestItem/PullRequestItem.component';
import ListPagination from '../ListPagination/ListPagination.component';
import BarChart from '../BarChart/BarChart.component';
import GanttChart from '../GanttChart/GanttChart.component';
import axios from 'axios';
import { log } from '../../utils';

import './PullRequests.style.scss';

const MAX_NUM_OF_RECORDS_PER_PAGE = 20;

let sortedRecordsByLR = [];
let sortedRecordsByCA = [];

let globalFetchDataExecutionId = 0;

const fetchAllPullRequests = async (
  now,
  { owner, token },
  loadPRsReq,
  setFecthedRecords,
) => {
  if (!owner || !token) return;

  const localFetchDataExecutionId = globalFetchDataExecutionId = Math.floor(Math.random() * 100);
  // log({ startFetchingData: localFetchDataExecutionId });

  sortedRecordsByLR = [];
  sortedRecordsByCA = [];

  let numberOfFecthedRecord = 0;

  if (!loadPRsReq.maxNumberOfPRs) {
    setFecthedRecords(0);
  }

  let loadRepos = loadPRsReq.repos;

  loadRepos.forEach(loadRepo => {
    loadRepo.currPage = 1;
    loadRepo.lastPage = Math.ceil(loadRepo.numberOfPRs / MAX_NUM_OF_RECORDS_PER_PAGE);
  });

  if (!loadRepos.length) {
    setFecthedRecords(0);
  }

  // log({ reposLen: loadRepos.length });

  try {
    let i = 0;
    while (loadRepos.length && numberOfFecthedRecord < loadPRsReq.maxNumberOfPRs && i++ < 100) {
      for (let r = 0; r < loadRepos.length && numberOfFecthedRecord < loadPRsReq.maxNumberOfPRs; r++) {
        const loadRepo = loadRepos[r];
        const { currPage, name } = loadRepo;

        const url = `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=${MAX_NUM_OF_RECORDS_PER_PAGE}&page=${currPage}`;
        let response;
        try {
          response = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          // Check if this loading process is paused
          if (loadPRsReq.loadState.isStopped) {
            log({ stoppedFetching: true });
            return;
          }

          // Check if this loading process is paused
          log({
            loadStateIsPaused: loadPRsReq.loadState.isPaused,
            numberOfLoadedPRs: loadPRsReq.loadState.numberOfLoadedPRs,
          });
          if (loadPRsReq.loadState.isPaused) {
            log({ toContinue: 'waiting...' });
            const toContinue = await loadPRsReq.loadState.toContinue;
            log({ toContinue });
            if (!toContinue) {
              return;
            }
          }

          // Check if a new loading operation is on going
          if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
            log({ localFetchDataExecutionId, globalFetchDataExecutionId });
            return;
          }

        } catch (err) {
          // @TODO: do something with this error
          console.log('near err:', err);
          throw err;
        }

        const numOfRecordsPerCurrPage = Math.min(
          loadPRsReq.maxNumberOfPRs - numberOfFecthedRecord,
          MAX_NUM_OF_RECORDS_PER_PAGE,
        );

        const recordsPerPage = response.data.slice(0, numOfRecordsPerCurrPage).map(({
          id,
          state,
          title,
          html_url,
          user,
          created_at,
          updated_at,
          closed_at,
          merged_at,
          draft,
          base: { repo },
        }) => ({
          id,
          state: state === 'open' ? (draft ? 'draft' : state) : (merged_at ? 'merged' : state),
          title,
          html_url,
          user: {
            name: user?.login,
            avatar_url: user?.avatar_url,
            html_url: user?.html_url,
          },
          repo: {
            full_name: repo?.full_name || '',
            html_url: repo?.html_url || '',
          },
          loadRepo,
          filterStatus: loadPRsReq.filterStatus,
          prColor: loadPRsReq.prColor,
          longRunning: ((new Date(closed_at).getTime() || now) - new Date(created_at).getTime()),
          created_at,
          updated_at,
          closed_at,
        }));

        // log({ recordsPerPageNum: recordsPerPage.map(({ id }) => id) });

        // Sorted by Long-Running
        sortedRecordsByLR.push(...recordsPerPage);
        sortedRecordsByLR.sort((a, b) => b.longRunning - a.longRunning);
        // Sorted By Closed-At
        sortedRecordsByCA.push(...recordsPerPage);
        sortedRecordsByCA.sort((a, b) => {
          const diff1 = new Date(a.closed_at).getTime() || Date.now();
          const diff2 = new Date(b.closed_at).getTime() || Date.now();
          return diff2 - diff1;
        });
        setFecthedRecords(sortedRecordsByLR.length);

        // Update progress bar
        numberOfFecthedRecord += recordsPerPage.length;
        loadPRsReq.loadState.setNumberOfLoadedPRs(numberOfFecthedRecord);

        loadRepo.currPage++;

        if (numberOfFecthedRecord >= loadPRsReq.maxNumberOfPRs)
          break;
      }

      loadRepos = loadRepos.filter(({ currPage, lastPage }) => currPage <= lastPage);
    }
    // Data has fetched completly
    log({ callingComplete: numberOfFecthedRecord });
    loadPRsReq.loadState.complete();
  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    loadPRsReq.loadState.stop();
    setFecthedRecords(0);
    return 404;
  }
};

const PullRequestList = ({ records }) => {
  return (
    <div className='pr-list'>
      {records?.map(({ id, ...rest }) => <PullRequestItem {...rest} key={id} />)}
    </div>
  );
};

const PullRequests = ({ auth, loadPRsReq }) => {
  const [NOW, setNOW] = useState(0);
  const [paginatedRecords, setPaginatedRecords] = useState([]);
  const [allSortedPaginationRecordsByLR, setAllSortedPaginationRecordsByLR] = useState([]);
  const [allSortedRecordsByLR, setAllSortedRecordsByLR] = useState([]);
  const [allSortedRecordsByCA, setAllSortedRecordsByCA] = useState([]);
  const [pagination, setPagination] = useState({
    first: 1,
    last: 1,
    prev: 0,
    next: 1,
    curr: 1,
    perPage: 10,
  });

  useEffect(() => {
    const now = Date.now();
    fetchAllPullRequests(
      now,
      auth,
      loadPRsReq,
      setFecthedRecords,
    );
    setNOW(now);
  }, [auth, loadPRsReq]);

  const setFecthedRecords = () => {
    setAllSortedPaginationRecordsByLR([...sortedRecordsByLR]);
    setAllSortedRecordsByLR([...sortedRecordsByLR]);
    setAllSortedRecordsByCA([...sortedRecordsByCA]);
  };

  useEffect(() => {
    let prevLength = 0;
    const tId = setInterval(() => {
      const visibleRecords = allSortedPaginationRecordsByLR
        .filter(({ loadRepo: { enable }, state, filterStatus }) =>
          enable && filterStatus[state]
        );
      const totalVisibleRecords = visibleRecords.length;
      if (totalVisibleRecords === prevLength)
        return;

      const totalPages = Math.ceil(totalVisibleRecords / pagination.perPage);
      setPagination({
        ...pagination,
        last: totalPages,
        next: totalPages > 1 ? 2 : 1,
      });

      const startIndex = (pagination.curr - 1) * pagination.perPage;
      const endIndex = startIndex + pagination.perPage;

      setPaginatedRecords(visibleRecords.slice(startIndex, endIndex));
      prevLength = totalVisibleRecords;
    }, 100);

    return () => clearInterval(tId);
  }, [allSortedPaginationRecordsByLR]);

  const changePage = pageNumber => {
    if (pageNumber === pagination.curr) return;

    const visibleRecords = allSortedPaginationRecordsByLR
      .filter(({ loadRepo: { enable }, state, filterStatus }) =>
        enable && filterStatus[state]
      );

    setPagination({
      ...pagination,
      curr: pageNumber,
      prev: pageNumber - 1,
      next: pageNumber + 1,
    });

    const startIndex = (pageNumber - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(visibleRecords.slice(startIndex, endIndex));
  };

  log({ maxNumberOfPRs: loadPRsReq?.maxNumberOfPRs });

  if (!auth.owner || !auth.ownerType || !auth.token || !loadPRsReq?.maxNumberOfPRs)
    return null;

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      <div className='visualization-section'>
        <BarChart records={allSortedRecordsByLR} NOW={NOW} />
      </div>
      <div className='visualization-section'>
        <GanttChart records={allSortedRecordsByCA} NOW={NOW} />
      </div>
      <div className='visualization-section'>
        <PullRequestList records={paginatedRecords} />
        <ListPagination
          pagination={pagination}
          changePage={changePage}
        />
      </div>
    </div>
  );
};

export default PullRequests;
