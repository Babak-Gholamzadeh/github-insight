import pullRequestIcon from '../../../../assets/images/git-pull-request-svgrepo-com.svg';
import closedPullRequestIcon from '../../../../assets/images/check-svgrepo-com.svg';
import { addCommas } from '../../../../utils';

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
          <img src={pullRequestIcon} className="pr-icon" alt='open'/>
          <div className='pr-number'>{addCommas(PRs.open)} Open</div>
        </div>
        <div className='pr-section'>
          <img src={closedPullRequestIcon} className="pr-icon" alt='closed'/>
          <div className='pr-number'>{addCommas(PRs.closed)} Closed</div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryItem;
