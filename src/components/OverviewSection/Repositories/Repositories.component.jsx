import { useEffect, useState } from 'react';
import RepositoryItem from './RepositoryItem/RepositoryItem.component';
import ListPagination from '../../ListPagination/ListPagination.component';
import axios from 'axios';
import { log } from '../../../utils';

import './Repositories.style.scss';

const getNumberOfPRs = async ({ owner, token, repo, state }) => {
  const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=1&page=1`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return +response.headers.link
    ?.split(', ')
    .map(url => url.split('; '))
    .find(([_, rel]) => rel.includes('last'))
    ?.[0]
    .split('&page=')[1].replace('>', '') || 0;
}

const getRepositories = async ({ owner, ownerType, token }, page, currentPaginatin) => {
  try {
    const pagination = {
      ...currentPaginatin,
      curr: page,
    };
    let records = [];

    if (owner) {
      let nextPageUrl = `https://api.github.com/${ownerType === 'user' ? 'users' : 'orgs'}/${owner}/repos?sort=updated&direction=desc&per_page=10&page=${page}`;
      log({repoURL: nextPageUrl});
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

      records = await Promise.all(response.data.map(async ({
        id, name, html_url, description, visibility, language, updated_at,
      }) => {
        const [numberOfOpenPRs, numberOfClosedPRs] = await Promise.all([
          getNumberOfPRs({ owner, token, repo: name, state: 'open' }),
          getNumberOfPRs({ owner, token, repo: name, state: 'closed' }),
        ]);
        return {
          id,
          name,
          html_url,
          description,
          visibility,
          language,
          updated_at,
          PRs: {
            total: numberOfOpenPRs + numberOfClosedPRs,
            open: numberOfOpenPRs,
            closed: numberOfClosedPRs,
          },
        };
      }));
    }

    return {
      records,
      pagination,
    };
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    return error.response?.status || 500;
  }
};

const RepositoryList = ({ records, selectedRepos, addRepo, removeRepo }) =>
(
  <div className='repo-list'>
    {records?.map(({ id, ...rest }) =>
      <RepositoryItem
        id={id}
        key={id}
        selectedRepos={selectedRepos}
        addRepo={addRepo}
        removeRepo={removeRepo}
        {...rest}
      />)}
  </div>
);

const Repositories = ({ auth, selectedRepos, addRepo, removeRepo }) => {
  const [forbidden, setForbiddenError] = useState(false);
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
    const result = await getRepositories(auth, pageNumber, repos.pagination);
    if (typeof result === 'object') {
      setForbiddenError(false);
      setRepos(result);
    } else {
      console.log('getRepositories err:', result);
      if (result === 403)
        setForbiddenError(true);
    }
  };

  useEffect(() => {
    changePage(1);
  }, [auth]);

  return (
    <div className="repositories">
      <h3 className='section-title'>Repositories</h3>
      {
        forbidden
          ? <div className='forbidden'>You don't have access to this section</div>
          : <div>
            <RepositoryList
              records={repos.records}
              selectedRepos={selectedRepos}
              addRepo={addRepo}
              removeRepo={removeRepo}
            />
            <ListPagination pagination={repos.pagination} changePage={changePage} />
          </div>
      }
    </div>
  );
};

export default Repositories;
