import { useEffect, useState } from 'react';
import PullRequestItem from './PullRequestItem/PullRequestItem.component';
import ListPagination from '../ListPagination/ListPagination.component';
import BarChart from '../BarChart/BarChart.component';
import GanttChart from '../GanttChart/GanttChart.component';
import axios from 'axios';
import { getRandomColorWithName, log } from '../../utils';

import './PullRequests.style.scss';

const getPullRequests = async ({ organization, token }, repo, page, currentPaginatin) => {
  try {
    const pagination = {
      ...currentPaginatin,
      curr: page,
    };
    let records = [];

    console.log('repo:', repo);

    if (organization && token && repo) {
      let nextPageUrl = `https://api.github.com/repos/${organization}/${repo}/pulls?state=all&per_page=100&page=${page}`;
      const response = await axios.get(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      response.headers.link
        ?.split(', ')
        .map(url => url.split('; '))
        .reduce((acc, [url, rel]) => {
          const relVal = rel.replace('rel=', '').replaceAll('"', '');
          const page = url.split('&page=')[1].replace('>', '');
          acc[relVal] = +page;
          return acc;
        }, pagination);

      records = response.data
        .sort((a, b) => {
          const diff1 = (new Date(a.closed_at).getTime() || Date.now()) - new Date(a.created_at).getTime();
          const diff2 = (new Date(b.closed_at).getTime() || Date.now()) - new Date(b.created_at).getTime();
          return diff2 - diff1;
        })
        .map(({
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
          longRunning: ((new Date(closed_at).getTime() || Date.now()) - new Date(created_at).getTime()),
          created_at,
          updated_at,
          closed_at,
        }));
    }

    return {
      records,
      pagination,
    };
  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    throw error;
  }
};

const RECORDS_PER_PAGE = 20;

const getTotalNumOfRecords = async (token, url) => {
  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return +(
    response.headers.link
      ?.split(', ')
      .find(sec => sec.includes('last'))
      ?.split('; ')[0]
      .split('&page=')[1]
      .replace('>', '')
    ?? 0
  );
};

let sortedRecordsByLR = [];
let sortedRecordsByCA = [];

const fetchAllPullRequests = async (
  now,
  { organization, token },
  repos,
  setTotalFecthedRecords,
  updateFetchingDataProgress,
) => {
  if (!organization || !token || !repos?.length) return;

  let numberOfTOtalRecords = 0;
  let numberOfFecthedRecord = 0;
  repos.forEach(repo => {
    repo.currPage = 1;
    repo.lastPage = Math.ceil(repo.numberOfPRs / RECORDS_PER_PAGE);
    repo.color = getRandomColorWithName(repo.name);
    numberOfTOtalRecords += repo.numberOfPRs;
  });

  try {
    let i = 0;
    while (repos.length && i++ < 20) {
      for (const { currPage, name, color } of repos) {
        const url = `https://api.github.com/repos/${organization}/${name}/pulls?state=all&per_page=${RECORDS_PER_PAGE}&page=${currPage}`;
        let response;
        try {
          response = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } catch (err) {
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
        updateFetchingDataProgress(numberOfFecthedRecord, numberOfTOtalRecords);
      }

      repos = repos
        .map(({ currPage, ...rest }) => ({ ...rest, currPage: currPage + 1, }))
        .filter(({ currPage, lastPage }) => currPage <= lastPage);
      console.log('repos:', repos);
    }
  } catch (error) {
    console.error('Error fetching pull requests:', error.message);
    throw error;
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

const auth = {
  organization: 'nodejs',
  token: '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',
};

const selectedRepos = [
  {
    name: 'node-addon-api',
    numberOfPRs: 689,
  },
  {
    name: 'Release',
    numberOfPRs: 281,
  },
  {
    name: 'nodejs.org',
    numberOfPRs: 4901,
  },
];

// const PullRequests = ({ auth }) => {
const PullRequests = () => {
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

  const fetchData = async now => {
    await fetchAllPullRequests(now, auth, selectedRepos, updatePageData, updateFetchingDataProgress);
  };
  useEffect(() => {
    const now = Date.now();
    fetchData(now);
    setNOW(now);
  }, [auth, selectedRepos]);

  const updatePageData = (totalFecthedRecords) => {
    // console.log('updatePageData > totalFecthedRecords:', totalFecthedRecords);
    const totalPages = Math.ceil(totalFecthedRecords / pagination.perPage);
    setPagination({
      ...pagination,
      last: totalPages,
      next: totalPages > 1 ? 2 : 1,
    });

    const startIndex = (pagination.curr - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(sortedRecordsByLR.slice(startIndex, endIndex));
    // setPaginatedRecords(sortedRecordsByCA.slice(startIndex, endIndex));
    setAllSortedRecordsByLR([...sortedRecordsByLR]);
    setAllSortedRecordsByCA([...sortedRecordsByCA]);
    // console.log('sortedRecordsByCA[%d]:', startIndex, sortedRecordsByCA[startIndex].title);
  };

  const updateFetchingDataProgress = (numberOfFecthedRecord, numberOfTOtalRecords) => {
    log({ numberOfFecthedRecord, numberOfTOtalRecords });
    setProgress(numberOfFecthedRecord * 100 / numberOfTOtalRecords);
  };

  const changePage = pageNumber => {
    // console.log('changePage > pageNumber:', pageNumber);
    setPagination({
      ...pagination,
      curr: pageNumber,
      prev: pageNumber - 1,
      next: pageNumber + 1,
    });

    const startIndex = pageNumber * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(sortedRecordsByLR.slice(startIndex, endIndex));
    // setPaginatedRecords(sortedRecordsByCA.slice(startIndex, endIndex));
  };

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      <div className={'selected-reop-list' + (progress >= 100 ? ' data-loaded' : '')}>
        {progress < 100 ? <div className='progress-bar' style={{ width: `${progress}%` }}>{`${Math.round(progress)}%`}</div> : null}
        {
          selectedRepos.map(({ name, color }) => {
            return (
              <div className='selected-repo-item' key={name}>
                <div className='selected-repo-item-name'>{name}</div>
                <div className='selected-repo-item-color' style={{ backgroundColor: color }}></div>
              </div>
            );
          })
        }
      </div>
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
