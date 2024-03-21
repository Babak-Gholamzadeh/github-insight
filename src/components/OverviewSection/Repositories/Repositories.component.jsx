import { useEffect, useState } from 'react';
import RepositoryTools from './RepositoryTools/RepositoryTools.component';
import RepositoryItem from './RepositoryItem/RepositoryItem.component';
import ListPagination from '../../ListPagination/ListPagination.component';
// import APIs from '../../../api/config';
// import useApi from '../../../api/useApi';
import axios from 'axios';

import './Repositories.style.scss';

const getNumberOfPRs = async ({ organization, token, repo, state }) => {
  const response = await axios.get(`https://api.github.com/repos/${organization}/${repo}/pulls?state=${state}&per_page=1&page=1`, {
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

const getRepositories = async ({ organization, token }, page, currentPaginatin) => {
  try {
    const pagination = {
      ...currentPaginatin,
      curr: page,
    };
    let records = [];

    if (organization && token) {
      let nextPageUrl = `https://api.github.com/orgs/${organization}/repos?per_page=10&page=${page}`;
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

      records = await Promise.all(response.data.map(async ({ id, name, html_url }) => {
        const [numberOfOpenPRs, numberOfClosedPRs] = await Promise.all([
          getNumberOfPRs({ organization, token, repo: name, state: 'open' }),
          getNumberOfPRs({ organization, token, repo: name, state: 'closed' }),
        ]);
        return {
          id,
          name,
          html_url,
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
    throw error;
  }
};

const RepositoryList = ({ records }) => {
  const noItem = <div className="no-item">There is nothing here!</div>;
  const items = records?.map(({ id, ...rest }) => <RepositoryItem {...rest} key={id} />);

  return (
    <div className='repo-list'>
      {items || noItem}
    </div>
  );
};

const Repositories = ({ auth }) => {
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
    setRepos(result);
  };

  useEffect(() => {
    changePage(1);
  }, [auth]);

  return (
    <div className="repositories">
      <h3 className='section-title'>Repositories</h3>
      <RepositoryTools />
      <RepositoryList records={repos.records} />
      <ListPagination pagination={repos.pagination} changePage={changePage} />
    </div>
  );
};

export default Repositories;
