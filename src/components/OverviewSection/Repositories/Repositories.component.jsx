import { useEffect, useState } from 'react';
import RepositoryItem from './RepositoryItem/RepositoryItem.component';
import ListPagination from '../../ListPagination/ListPagination.component';
import TextInput from '../../TextInput/TextInput.component';
import axios from 'axios';
import { log } from '../../../utils';

import './Repositories.style.scss';

const getNumberOfRepos = async ({ owner, ownerType, token }) => {
  const response = await axios.get(`https://api.github.com/${ownerType === 'user' ? 'users' : 'orgs'}/${owner}/repos?per_page=1&page=1`, {
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
};

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
};

const MAX_NUMBER_OF_REPO_TO_FETCH = 1000;

const NUM_OF_RECORDS_PER_PAGE = 10;

let repositories = [];

let globalFetchDataExecutionId = 0;

const fetchRepositories = async (
  { owner, ownerType, token },
  setForbiddenError,
  setFecthedRecords,
) => {
  if (!owner || !ownerType || !token) return;

  const localFetchDataExecutionId = globalFetchDataExecutionId = Math.floor(Math.random() * 100);

  repositories = [];

  try {
    const totalNumberOfRepos = Math.min(
      await getNumberOfRepos({ owner, ownerType, token }),
      MAX_NUMBER_OF_REPO_TO_FETCH,
    );

    // Check if a new loading operation is on going
    if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
      log({ localFetchDataExecutionId, globalFetchDataExecutionId });
      return;
    }

    const TOTAL_PAGES = Math.ceil(totalNumberOfRepos / NUM_OF_RECORDS_PER_PAGE);

    for (let page = 1; page <= TOTAL_PAGES; page++) {
      const url = `https://api.github.com/${ownerType === 'user' ? 'users' : 'orgs'}/${owner}/repos?sort=updated&direction=desc&per_page=${NUM_OF_RECORDS_PER_PAGE}&page=${page}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Check if a new loading operation is on going
      if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
        log({ localFetchDataExecutionId, globalFetchDataExecutionId });
        return;
      }

      const recordsPerPage = await Promise.all(response.data.map(async ({
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

      // Check if a new loading operation is on going
      if (localFetchDataExecutionId !== globalFetchDataExecutionId) {
        log({ localFetchDataExecutionId, globalFetchDataExecutionId });
        return;
      }

      // log({ recordsPerPageLen: recordsPerPage.length, recordsPerPage });

      repositories.push(...recordsPerPage);
      log({ repoFetched: repositories.length, done: false });
      setFecthedRecords(repositories.length);
    }

    log({ repoFetched: repositories.length, done: true });
  } catch (error) {
    console.error('Error fetching repos:', error.message);
    setFecthedRecords(0);
    setForbiddenError(true);
  }
};

const RepositoriesTools = ({ findRepo }) => {
  const [findRepoText, setFindRepoText] = useState('');

  const onChangeFindText = e => {
    const { value } = e.target;
    setFindRepoText(value);
    findRepo(value.toLowerCase());
  }

  return (
    <div className='repo-tools'>
      <div className='repo-find'>
        <TextInput
          type='search'
          placeholder='Find a repository…'
          value={findRepoText}
          onChange={onChangeFindText}
          className='repo-find-input'
        />
      </div>
      <div className='repo-sort'>
        <div className='sort-button'>Sort</div>
      </div>
    </div>
  );
};

const RepositoryList = ({ records, selectedRepos, addRepo, removeRepo }) => (
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
  const [paginatedRecords, setPaginatedRecords] = useState([]);
  const [allSortedRepositories, setAllSortedRepositories] = useState([]);
  const [filterRepoByName, setFilterRepoByName] = useState('');
  const [pagination, setPagination] = useState({
    first: 1,
    last: 1,
    prev: 0,
    next: 1,
    curr: 1,
    perPage: 10,
  });

  useEffect(() => {
    fetchRepositories(
      auth,
      setForbiddenError,
      setFecthedRecords,
    );
  }, [auth]);

  const setFecthedRecords = () => {
    setAllSortedRepositories([...repositories]);
  };

  useEffect(() => {
    const filteredList = filterRepoByName
      ? allSortedRepositories.filter(({ name }) => name.toLowerCase().includes(filterRepoByName))
      : allSortedRepositories;

    const totalPages = Math.ceil(filteredList.length / pagination.perPage);

    setPagination({
      ...pagination,
      last: totalPages,
      next: totalPages > 1 ? 2 : 1,
    });

    const startIndex = (pagination.curr - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(filteredList.slice(startIndex, endIndex));
  }, [allSortedRepositories, filterRepoByName]);

  const changePage = pageNumber => {
    if (pageNumber === pagination.curr) return;

    const filteredList = filterRepoByName
      ? allSortedRepositories.filter(({ name }) => name.toLowerCase().includes(filterRepoByName))
      : allSortedRepositories;

    setPagination({
      ...pagination,
      curr: pageNumber,
      prev: pageNumber - 1,
      next: pageNumber + 1,
    });

    const startIndex = (pageNumber - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(filteredList.slice(startIndex, endIndex));
  };

  if (!auth.owner || !auth.ownerType || !auth.token)
    return null;

  return (
    <div className='repositories'>
      <h3 className='section-title'>Repositories</h3>
      {
        forbidden
          ? <div className='forbidden'>You don't have access to this section</div>
          : <>
            <RepositoriesTools findRepo={setFilterRepoByName} />
            <RepositoryList
              records={paginatedRecords}
              selectedRepos={selectedRepos}
              addRepo={addRepo}
              removeRepo={removeRepo}
            />
            <ListPagination
              pagination={pagination}
              changePage={changePage}
            />
          </>
      }
    </div>
  );
};

export default Repositories;
