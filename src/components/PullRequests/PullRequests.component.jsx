import { useEffect, useState } from 'react';
import PullRequestItem from './PullRequestItem/PullRequestItem.component';
import ListPagination from '../ListPagination/ListPagination.component';
import BarChart from '../BarChart/BarChart.component';
import GanttChart from '../GanttChart/GanttChart.component';
import axios from 'axios';

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

const RECORDS_PER_PAGE = 50;
const PAR_PAGES = 10;

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

const fetchAllPullRequests = async ({ organization, token }, repo, setTotalFecthedRecords) => {
  try {
    if (organization && token && repo) {
      const totalNumOfRecords = await getTotalNumOfRecords(token, `https://api.github.com/repos/${organization}/${repo}/pulls?state=all&per_page=1&page=1`);
      // const totalNumOfRecords = 1000;
      const totalNumOfPages = Math.ceil(totalNumOfRecords / RECORDS_PER_PAGE);
      // console.log({
      //   totalNumOfRecords,
      //   totalNumOfPages,
      // });

      for (let p = 0; p < totalNumOfPages; p += PAR_PAGES) {
        const beingRange = p;
        const endRange = Math.min(beingRange + PAR_PAGES, totalNumOfPages);
        const currParPages = endRange - beingRange;
        // console.log(`Fetch pages from ${beingRange} to ${endRange}`);
        const recordsPerPageChunk = await Promise.all(Array.from({ length: currParPages }, async (_, i) => {
          const url = `https://api.github.com/repos/${organization}/${repo}/pulls?state=all&per_page=${RECORDS_PER_PAGE}&page=${i + beingRange}`;
          const response = await axios.get(url, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          return response.data.map(({
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
        }));
        const flatData = recordsPerPageChunk.flat(1);
        // Sorted by Long-Running
        sortedRecordsByLR.push(...flatData);
        sortedRecordsByLR
          .sort((a, b) => {
            const diff1 = (new Date(a.closed_at).getTime() || Date.now()) - new Date(a.created_at).getTime();
            const diff2 = (new Date(b.closed_at).getTime() || Date.now()) - new Date(b.created_at).getTime();
            return diff2 - diff1;
          });
        // Sorted By Closed-At
        sortedRecordsByCA.push(...flatData);
        sortedRecordsByCA
          .sort((a, b) => {
            const diff1 = new Date(a.closed_at).getTime() || Date.now();
            const diff2 = new Date(b.closed_at).getTime() || Date.now();
            return diff2 - diff1;
          });
        setTotalFecthedRecords(sortedRecordsByLR.length);
      }
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

// const PullRequests = ({ auth }) => {
const PullRequests = () => {
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

  const fetchData = async () => {
    // console.time('fetchAllPullRequests');
    await fetchAllPullRequests(auth, 'Release', updatePageData);
    // console.timeEnd('fetchAllPullRequests');
  };
  useEffect(() => {
    console.log('useEffect[auth]');
    fetchData();
  }, [auth]);

  const updatePageData = (totalFecthedRecords) => {
    console.log('updatePageData > totalFecthedRecords:', totalFecthedRecords);
    const totalPages = Math.ceil(totalFecthedRecords / pagination.perPage);
    setPagination({
      ...pagination,
      last: totalPages,
      next: totalPages > 1 ? 2 : 1,
    });

    const startIndex = pagination.curr * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(sortedRecordsByLR.slice(startIndex, endIndex));
    setAllSortedRecordsByLR([...sortedRecordsByLR]);
    setAllSortedRecordsByCA([...sortedRecordsByCA]);
  };

  const changePage = pageNumber => {
    console.log('changePage > pageNumber:', pageNumber);
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

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      <GanttChart records={allSortedRecordsByCA} />
      <BarChart records={allSortedRecordsByLR} />
      <PullRequestList records={paginatedRecords} />
      <ListPagination pagination={pagination} changePage={changePage} />
    </div>
  );
};

export default PullRequests;
