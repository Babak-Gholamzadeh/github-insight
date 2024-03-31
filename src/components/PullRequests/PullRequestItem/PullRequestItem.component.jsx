import draftPullRequestIcon from '../../../assets/images/git-pull-request-draft-svgrepo-com.svg';
import { useEffect, useState } from 'react';
import openPullRequestIcon from '../../../assets/images/git-pull-request-open-svgrepo-com.svg';
import mergedPullRequestIcon from '../../../assets/images/git-merge-svgrepo-com.svg';
import closedPullRequestIcon from '../../../assets/images/git-pull-request-closed-svgrepo-com.svg';
import {
  getReadableTimePeriod,
  getHumanReadableTimeAgo,
} from '../../../utils';

import './PullRequestItem.style.scss';

const PullRequestItem = ({
  loadPRsReq,
  state,
  title,
  html_url,
  user,
  repo,
  loadRepo,
  longRunning,
  created_at,
  closed_at,
}) => {
  const [isLoadStopped, setLoadStopped] = useState(false);

  useEffect(() => {
    const tId = setInterval(() => {
      setLoadStopped(loadPRsReq.loadState.isStopped);
    }, 100);
    return () => clearInterval(tId);
  }, [loadPRsReq]);

  return (
    <div className='pr-item'>
      <div
        className={'pr-repo-color' + (isLoadStopped ? ' load-stopped' : '')}
        style={{ backgroundColor: loadRepo.color }}></div>
      <div className='pr-title'>
        <div className='top-section'>
          <img src={
            (() => {
              // eslint-disable-next-line default-case
              switch (state) {
                case 'draft':
                  return draftPullRequestIcon;
                case 'open':
                  return openPullRequestIcon;
                case 'merged':
                  return mergedPullRequestIcon;
                case 'closed':
                  return closedPullRequestIcon;
              }
            })()
          } title={state} className='pr-state' alt='' />
          <a
            href={html_url}
            className='pr-link'
            target='_blank'
            rel='noreferrer'
          >
            {title}
          </a>
        </div>
        <div className='bottom-section'>
          <a
            href={repo.html_url}
            className='pr-repo-link'
            target='_blank'
            rel='noreferrer'
          >
            {repo.full_name}
          </a>
          <span className='pr-created-date'>{'Created ' + getHumanReadableTimeAgo(created_at)}</span>
        </div>
      </div>
      <div className='pr-long-running'>
        {getReadableTimePeriod(longRunning)}
      </div>
      <a
        href={user.html_url}
        className='pr-member-link'
        target='_blank'
        rel='noreferrer'
        title={user.name}
      >
        <img src={user.avatar_url} className='pr-member-avatar' alt='' />
      </a>
    </div>
  );
};

export default PullRequestItem;
