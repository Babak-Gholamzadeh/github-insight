import pullRequestIcon from '../../../../assets/images/git-pull-request-svgrepo-com.svg';
import draftPullRequestIcon from '../../../../assets/images/git-pull-request-draft-svgrepo-com.svg';
import openPullRequestIcon from '../../../../assets/images/git-pull-request-open-svgrepo-com.svg';
import mergedPullRequestIcon from '../../../../assets/images/git-merge-svgrepo-com.svg';
import closedPullRequestIcon from '../../../../assets/images/git-pull-request-closed-svgrepo-com.svg';

import './RepositoryItem.style.scss';

const RepositoryItem = ({
  name,
  html_url,
  PRs,
}) => {
  return (
    <div className="repo-item">
      <div>
        <a
          href={html_url}
          className="repo-link"
          target="_blank"
          rel="noreferrer"
        >
          {name}
        </a>
      </div>
      <div className='pr-numbers'>
        <div className='pr-section'>
          <img src={pullRequestIcon} className="pr-icon" />
          <div className='pr-number'>{PRs.total}</div>
        </div>
        <div className='pr-section'>
          <img src={draftPullRequestIcon} className="pr-icon" />
          <div className='pr-number'>{PRs.draft}</div>
        </div>
        <div className='pr-section'>
          <img src={openPullRequestIcon} className="pr-icon" />
          <div className='pr-number'>{PRs.open}</div>
        </div>
        <div className='pr-section'>
          <img src={mergedPullRequestIcon} className="pr-icon" />
          <div className='pr-number'>{PRs.merged}</div>
        </div>
        <div className='pr-section'>
          <img src={closedPullRequestIcon} className="pr-icon" />
          <div className='pr-number'>{PRs.closed}</div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryItem;
