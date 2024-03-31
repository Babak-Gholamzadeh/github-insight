/* eslint-disable default-case */
import { useEffect, useState, useRef } from 'react';
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

const SORT_BY = {
  LAST_UPDATED: 0,
  OPEN_PRS: 1,
  CLOSED_PRS: 2,
  TOTAL_PRS: 3,
  NAME: 4,
  PROG_LANG: 5,
};

const RepositoriesTools = ({ findRepo, sortRepo }) => {
  const [findRepoText, setFindRepoText] = useState('');
  const [sortMenuVisiblity, setSortMenuVisiblity] = useState(false);
  const [selectedSort, setSelectedSort] = useState(SORT_BY.LAST_UPDATED);
  const refSort = useRef();

  const onChangeFindText = e => {
    const { value } = e.target;
    setFindRepoText(value);
    findRepo(value.toLowerCase());
  };

  const onChangeSort = e => {
    const sortBy = +e.target.getAttribute('data-sort-by');
    log({ sortBy });
    setSelectedSort(sortBy);
    setSortMenuVisiblity(false);
    sortRepo(sortBy);
  };

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
        <div className='sort-button'
          ref={refSort}
          onKeyDown={() => log({ keyUp: 1 })}
          onClick={() => {
            refSort.current.focus();
            setSortMenuVisiblity(!sortMenuVisiblity);
          }}>
          Sort</div>
        <ul className={'sort-menu' + (sortMenuVisiblity ? ' show' : '')}>
          <li className='sort-menu-item select-order'>
            Select order
            <span className='sort-menu-close-button'
              onClick={() => setSortMenuVisiblity(false)}></span>
          </li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.LAST_UPDATED ? ' selected' : '')}
            data-sort-by={SORT_BY.LAST_UPDATED}
            onClick={onChangeSort}>
            Last Updated</li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.OPEN_PRS ? ' selected' : '')}
            data-sort-by={SORT_BY.OPEN_PRS}
            onClick={onChangeSort}>
            Number of Open PRs</li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.CLOSED_PRS ? ' selected' : '')}
            data-sort-by={SORT_BY.CLOSED_PRS}
            onClick={onChangeSort}>
            Number of Closed PRs</li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.TOTAL_PRS ? ' selected' : '')}
            data-sort-by={SORT_BY.TOTAL_PRS}
            onClick={onChangeSort}>
            Number of Total PRs</li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.NAME ? ' selected' : '')}
            data-sort-by={SORT_BY.NAME}
            onClick={onChangeSort}>
            Name</li>
          <li className={'sort-menu-item' + (selectedSort === SORT_BY.PROG_LANG ? ' selected' : '')}
            data-sort-by={SORT_BY.PROG_LANG}
            onClick={onChangeSort}>
            Programming Language</li>
        </ul>
      </div>
    </div >
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
  const [allFetchedRepositories, setAllFetchedRepositories] = useState([]);
  const [filteredAndSortedRepos, setFilteredAndSortedRepos] = useState([]);
  const [filterRepoByName, setFilterRepoByName] = useState('');
  const [sortRepoBy, setSortRepoBy] = useState(SORT_BY.LAST_UPDATED);
  const [paginatedRecords, setPaginatedRecords] = useState([]);
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
    setAllFetchedRepositories([...repositories]);
  };

  useEffect(() => {
    setFilteredAndSortedRepos(
      allFetchedRepositories
        .filter(({ name }) => name.toLowerCase().includes(filterRepoByName))
        .sort((a, b) => {
          switch (sortRepoBy) {
            case SORT_BY.OPEN_PRS:
              return b.PRs.open - a.PRs.open;
            case SORT_BY.CLOSED_PRS:
              return b.PRs.closed - a.PRs.closed;
            case SORT_BY.TOTAL_PRS:
              return b.PRs.total - a.PRs.total;
            case SORT_BY.NAME:
              return a.name.localeCompare(b.name);
            case SORT_BY.PROG_LANG:
              return a.language ? a.language.localeCompare(b.language) : 1;
            default: // SORT_BY.LAST_UPDATED
              return b.updated_at - a.updated_at;
          }
        })
    );
  }, [allFetchedRepositories, filterRepoByName, sortRepoBy]);

  useEffect(() => {
    const totalPages = Math.ceil(filteredAndSortedRepos.length / pagination.perPage);

    setPagination({
      ...pagination,
      last: totalPages,
      next: totalPages > 1 ? 2 : 1,
    });

    const startIndex = (pagination.curr - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(filteredAndSortedRepos.slice(startIndex, endIndex));
  }, [filteredAndSortedRepos]);

  const changePage = pageNumber => {
    if (pageNumber === pagination.curr) return;

    setPagination({
      ...pagination,
      curr: pageNumber,
      prev: pageNumber - 1,
      next: pageNumber + 1,
    });

    const startIndex = (pageNumber - 1) * pagination.perPage;
    const endIndex = startIndex + pagination.perPage;
    setPaginatedRecords(filteredAndSortedRepos.slice(startIndex, endIndex));
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
            <RepositoriesTools
              findRepo={setFilterRepoByName}
              sortRepo={setSortRepoBy} />
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
