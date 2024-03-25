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
  setTotalFecthedRecords,
  updateFetchingDataProgress,
) => {
  if (!owner || !token) return;

  const localFetchDataExecutionId = globalFetchDataExecutionId = Math.floor(Math.random() * 100);
  // log({ startFetchingData: localFetchDataExecutionId });

  sortedRecordsByLR = [];
  sortedRecordsByCA = [];

  let numberOfTOtalRecords = 0;
  let numberOfFecthedRecord = 0;

  if (!loadPRsReq.maxNumberOfPRs) {
    setTotalFecthedRecords(0);
  }

  let repos = JSON.parse(JSON.stringify(loadPRsReq.repos)); //.filter(({ enable }) => enable);

  repos.forEach(repo => {
    repo.currPage = 1;
    repo.lastPage = Math.ceil(repo.numberOfPRs / MAX_NUM_OF_RECORDS_PER_PAGE);
    numberOfTOtalRecords += repo.numberOfPRs;
  });

  if (!repos.length) {
    setTotalFecthedRecords(0);
  }

  // log({ reposLen: repos.length });

  try {
    let i = 0;
    while (repos.length && numberOfFecthedRecord < loadPRsReq.maxNumberOfPRs && i++ < 100) {
      for (const { currPage, name, color } of repos) {
        const numOfRecordsPerPage = Math.min(
          loadPRsReq.maxNumberOfPRs - numberOfFecthedRecord,
          MAX_NUM_OF_RECORDS_PER_PAGE,
        );
        const url = `https://api.github.com/repos/${owner}/${name}/pulls?state=all&per_page=${numOfRecordsPerPage}&page=${currPage}`;
        let response;
        try {
          response = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
            log({ localFetchDataExecutionId, globalFetchDataExecutionId });
            return;
          }
        } catch (err) {
          // @TODO: do something with this error
          console.log('near err:', err);
          throw err;
        }
        const recordsPerPage = response.data.map(({
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
            color,
          },
          longRunning: ((new Date(closed_at).getTime() || now) - new Date(created_at).getTime()),
          created_at,
          updated_at,
          closed_at,
        }));

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
        setTotalFecthedRecords(sortedRecordsByLR.length);

        // Update progress bar
        numberOfFecthedRecord += recordsPerPage.length;
        updateFetchingDataProgress(numberOfFecthedRecord, loadPRsReq.maxNumberOfPRs);

        if(numberOfFecthedRecord >= loadPRsReq.maxNumberOfPRs)
          break;
      }

      repos = repos
        .map(({ currPage, ...rest }) => ({ ...rest, currPage: currPage + 1, }))
        .filter(({ currPage, lastPage }) => currPage <= lastPage);
    }
  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    setTotalFecthedRecords(0);
    updateFetchingDataProgress(0, 0);
    return 404;
  }
};

const PullRequestList = ({ records }) => {
  const noItem = <div className="no-item">There is nothing here!</div>;
  const items = records?.map(({ id, ...rest }) => <PullRequestItem {...rest} key={id} />);

  return (
    <div className='pr-list'>
      {items || noItem}
    </div>
  );
};

const PullRequests = ({ auth, loadPRsReq }) => {
  const [NOW, setNOW] = useState(0);
  const [progress, setProgress] = useState(0);
  // console.log('PullRequests Component');

  const [paginatedRecords, setPaginatedRecords] = useState([]);
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



  const fetchData = async (now, loadPRsReq) => {
    await fetchAllPullRequests(now, auth, loadPRsReq, updatePageData, updateFetchingDataProgress);
  };
  useEffect(() => {
    const now = Date.now();
    fetchData(now, loadPRsReq);
    setNOW(now);
  }, [auth, loadPRsReq]);

  const updatePageData = (totalFecthedRecords) => {
    const totalPages = Math.ceil(totalFecthedRecords / pagination.perPage);
    setPagination({
      ...pagination,
      last: totalPages,
      next: totalPages > 1 ? 2 : 1,
    });

    const startIndex = (pagination.curr - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(sortedRecordsByLR.slice(startIndex, endIndex));
    setAllSortedRecordsByLR([...sortedRecordsByLR]);
    setAllSortedRecordsByCA([...sortedRecordsByCA]);
  };

  const updateFetchingDataProgress = (numberOfFecthedRecord, numberOfTOtalRecords) => {
    log({ numberOfFecthedRecord, numberOfTOtalRecords });
    setProgress(numberOfFecthedRecord * 100 / numberOfTOtalRecords);
  };

  const changePage = pageNumber => {
    setPagination({
      ...pagination,
      curr: pageNumber,
      prev: pageNumber - 1,
      next: pageNumber + 1,
    });

    const startIndex = pageNumber * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(sortedRecordsByLR.slice(startIndex, endIndex));
  };

  // const makeSelectedRepoListSticky = e => {
  //   const sticky = e.getBoundingClientRect();

  // };
  // const [offset, setOffset] = useState(0);
  // const handleScroll = () => {
  //   log({ here: 1 });
  //   // Perform actions on scroll
  // };
  // useEffect(() => {
  //   log({ useEffect: 1 });
  //   window.addEventListener('scroll', handleScroll);
  //   return () => {
  //     log({ useEffect: 0 });
  //     window.removeEventListener('scroll', handleScroll);
  //   };
  // }, []);
  // console.log('offset:', offset);

  if (!auth.owner || !auth.ownerType || !auth.token || !loadPRsReq?.maxNumberOfPRs)
    return null;

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      {/* <div className={'selected-reop-list' + (progress >= 100 ? ' data-loaded' : '')}>
        {progress < 100 ? <div className='progress-bar' style={{ width: `${progress}%` }}>{`${Math.round(progress)}%`}</div> : null}
        {
          selectedRepos ? selectedRepos.map(({ id, name, color, enable }) => {
            return (
              <div className={'selected-repo-item' + (enable ? '' : ' disabled')} key={id} onClick={() => toggleSelectedRepo(id)}>
                <div className='selected-repo-item-name'>{name}</div>
                <div className='selected-repo-item-color' style={{ backgroundColor: color }}></div>
              </div>
            );
          }) : null
        }
      </div> */}
      <div className='visualization-section'>
        <BarChart records={allSortedRecordsByLR} NOW={NOW} />
      </div>
      <div className='visualization-section'>
        <GanttChart records={allSortedRecordsByCA} NOW={NOW} />
      </div>
      <div className='visualization-section'>
        <PullRequestList records={paginatedRecords} />
        <ListPagination pagination={pagination} changePage={changePage} />
      </div>
    </div >
  );
};

export default PullRequests;
