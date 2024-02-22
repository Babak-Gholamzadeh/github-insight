import draftPullRequestIcon from '../../../assets/images/git-pull-request-draft-svgrepo-com.svg';
import openPullRequestIcon from '../../../assets/images/git-pull-request-open-svgrepo-com.svg';
import mergedPullRequestIcon from '../../../assets/images/git-merge-svgrepo-com.svg';
import closedPullRequestIcon from '../../../assets/images/git-pull-request-closed-svgrepo-com.svg';

import './PullRequestItem.style.scss';

// function getReadableTimePeriod(milliseconds) {
//   const units = [
//     { label: 'y', duration: 365.25 * 24 * 60 * 60 * 1000 },
//     { label: 'mo', duration: 30.44 * 24 * 60 * 60 * 1000 },
//     { label: 'd', duration: 24 * 60 * 60 * 1000 },
//     { label: 'h', duration: 60 * 60 * 1000 },
//     { label: 'min', duration: 60 * 1000 },
//   ];

//   let result = units
//     .map(unit => {
//       const value = Math.floor(milliseconds / unit.duration);
//       milliseconds %= unit.duration;
//       return value ? `${value}${unit.label}` : '';
//     })
//     .filter(Boolean)
//     .join(' ');

//   return result || 'less than a min';
// }

function getReadableTimePeriod(milliseconds) {
  const units = [
    { label: 'year', duration: 365.25 * 24 * 60 * 60 * 1000 },
    { label: 'month', duration: 30.44 * 24 * 60 * 60 * 1000 },
    { label: 'day', duration: 24 * 60 * 60 * 1000 },
    { label: 'hour', duration: 60 * 60 * 1000 },
    { label: 'minute', duration: 60 * 1000 },
  ];

  let result = units
    .map(unit => {
      const value = Math.floor(milliseconds / unit.duration);
      milliseconds %= unit.duration;
      return value ? `${value} ${unit.label}${value === 1 ? '' : 's'}` : '';
    })
    .filter(Boolean)
    .join(' ');

  return result || 'less than a minute';
}

const PullRequestItem = ({
  state,
  title,
  html_url,
  user,
  repo,
  longRunning,
  created_at,
  closed_at,
}) => {
  return (
    <div className="pr-item">
      <div className='pr-title'>
        <div className='top-section'>
          <img src={
            (() => {
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
          } title={state} className='pr-state' alt=''/>
          <a
            href={html_url}
            className="pr-link"
            target="_blank"
            rel="noreferrer"
          >
            {title}
          </a>
        </div>
        <div className='bottom-section'>
          <a
            href={repo.html_url}
            className="pr-repo-link"
            target="_blank"
            rel="noreferrer"
          >
            {repo.full_name}
          </a>
        </div>
      </div>
      <div className='pr-long-running'>
        {getReadableTimePeriod(longRunning)}
      </div>
      <a
        href={user.html_url}
        className="pr-member-link"
        target="_blank"
        rel="noreferrer"
        title={user.name}
      >
        <img src={user.avatar_url} className='pr-member-avatar' alt=''/>
      </a>
    </div>
  );
};

export default PullRequestItem;
