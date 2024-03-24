import pullRequestIcon from '../../../../assets/images/git-pull-request-svgrepo-com.svg';
import closedPullRequestIcon from '../../../../assets/images/check-svgrepo-com.svg';
import { addCommas } from '../../../../utils';
import addIcon from '../../../../assets/images/plus-svgrepo-com.svg';
import removeIcon from '../../../../assets/images/minus-svgrepo-com.svg';

import './RepositoryItem.style.scss';

const RepositoryItem = ({
  id,
  name,
  html_url,
  PRs,
  selectedRepos,
  addRepo,
  removeRepo,
}) => {
  const selected = selectedRepos.find(repo => repo.id === id);
  return (
    <div className="repo-item">
      <div
        className='action-button'
        onClick={() => selected ? removeRepo(id) : addRepo({ id, name, numberOfPRs: PRs.total })}
      >
        <img src={selected ? removeIcon : addIcon} alt="" />
      </div>
      <div className='repo-title'>
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
          <img src={pullRequestIcon} className="pr-icon" alt='open' />
          <div className='pr-number'>{addCommas(PRs.open)} Open</div>
        </div>
        <div className='pr-section'>
          <img src={closedPullRequestIcon} className="pr-icon" alt='closed' />
          <div className='pr-number'>{addCommas(PRs.closed)} Closed</div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryItem;
