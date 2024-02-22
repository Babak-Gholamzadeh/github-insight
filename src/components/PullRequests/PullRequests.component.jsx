import { useEffect, useState } from 'react';
import PullRequestItem from './PullRequestItem/PullRequestItem.component';
import ListPagination from '../ListPagination/ListPagination.component';
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
        head: { repo },
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
          name: repo?.name || '',
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

const PullRequestList = ({ records }) => {
  const noItem = <div className="no-item">There is nothing here!</div>;
  const items = records?.map(({ id, ...rest }) => <PullRequestItem {...rest} key={id} />);

  return (
    <div className='pr-list'>
      {items || noItem}
    </div>
  );
};

const PullRequests = ({ auth }) => {
  const [repos, setRepos] = useState({
    records: [],
    pagination: {
      first: 1,
      last: 1,
      prev: 0,
      next: 1,
      curr: 1,
    },
  });

  const changePage = async pageNumber => {
    const result = await getPullRequests(auth, 'node', pageNumber, repos.pagination);
    setRepos(result);
  };

  useEffect(() => {
    changePage(1);
  }, [auth]);

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      {/* <PullRequestTools /> */}
      <PullRequestList records={repos.records} />
      <ListPagination pagination={repos.pagination} changePage={changePage} />
    </div>
  );
};

export default PullRequests;
