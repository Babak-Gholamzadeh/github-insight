import pullRequestIcon from '../../../../assets/images/git-pull-request-svgrepo-com.svg';
import closedPullRequestIcon from '../../../../assets/images/check-svgrepo-com.svg';
import addIcon from '../../../../assets/images/plus-svgrepo-com.svg';
import removeIcon from '../../../../assets/images/minus-svgrepo-com.svg';
import {
  addCommas,
  capitalizeSentence,
  getHumanReadableTimeAgo,
  getRandomColorWithName,
  convertTextToLink,
} from '../../../../utils';

import './RepositoryItem.style.scss';

const languageColors = {
  "JavaScript": "#f1e05a",
  "Python": "#3572A5",
  "Java": "#b07219",
  "HTML": "#e34c26",
  "CSS": "#563d7c",
  "Ruby": "#701516",
  "C": "#555555",
  "C++": "#f34b7d",
  "PHP": "#4F5D95",
  "Swift": "#ffac45",
  "Go": "#00ADD8",
  "TypeScript": "#2b7489",
  "Rust": "#dea584",
  "Kotlin": "#F18E33",
  "Scala": "#c22d40",
  "Perl": "#0298c3",
  "Haskell": "#5e5086",
  "Lua": "#000080",
  "Shell": "#89e051",
  "PowerShell": "#012456",
  "Assembly": "#6E4C13",
  "Objective-C": "#438eff",
  "CoffeeScript": "#244776",
  "TeX": "#3D6117",
  "Vue": "#2c3e50",
  "Dart": "#00B4AB",
  "Clojure": "#db5855",
  "Matlab": "#e16737",
  "Groovy": "#e69f56",
  "Elixir": "#6e4a7e",
  "Dockerfile": "#384d54",
  "PLpgSQL": "#336790",
  "Erlang": "#B83998",
  "ActionScript": "#882B0F",
  "Common Lisp": "#3fb68b",
  "Visual Basic": "#945db7",
  "Crystal": "#000100",
  "Makefile": "#427819",
  "Processing": "#0096D8",
  "Vim script": "#199f4b",
  "Nim": "#ffc200",
  "TeX": "#3D6117",
  "WebAssembly": "#04133b",
};

const RepositoryItem = ({
  id,
  name,
  html_url,
  description,
  visibility,
  language,
  updated_at,
  PRs,
  selectedRepos,
  addRepo,
  removeRepo,
}) => {
  const selected = selectedRepos.find(repo => repo.id === id);
  return (
    <div className="repo-item">
      <div
        className={
          'repo-item-color' +
          (() => {
            if (PRs.total === 0)
              return ' disabled';
            return selected ? ' removable' : ' addable';
          })()
        }
      ></div>
      <div
        className={
          'action-button' +
          (() => {
            if (PRs.total === 0)
              return ' disabled';
            return selected ? ' remove-button' : ' add-button';
          })()
        }
        title={
          (() => {
            if (PRs.total === 0)
              return 'This repo does not have any PR to display';
            return selected ? 'Remove this repo from selected list' : 'Add this repo to the selected list';
          })()
        }
        onClick={() => {
          if (PRs.total === 0)
            return null;
          selected ? removeRepo(id) : addRepo({ id, name, numberOfPRs: PRs.total });
        }}
      >
        {PRs.total === 0 ? null : <img src={selected ? removeIcon : addIcon} alt="" />}
      </div>
      <div className='repo-info'>
        <div className='first-section'>
          <div className='repo-title'>
            <a
              href={html_url}
              className="repo-link"
              target="_blank"
              rel="noreferrer"
            >
              {name}
            </a>
            <span className='repo-visiblity'>{capitalizeSentence(visibility)}</span>
          </div>
        </div>
        <div className='second-section'>
          <div
            className='repo-desc'
            dangerouslySetInnerHTML={{ __html: convertTextToLink(description) }}
          ></div>
        </div>
        <div className='third-section'>
          {
            language ? <div className='repo-language'>
              <span
                className='repo-language-color'
                style={{ backgroundColor: languageColors[language] || getRandomColorWithName(language) }}
              ></span>
              {language}
            </div> : null
          }
          <div className='repo-updated-at'>
            {`Updated ${getHumanReadableTimeAgo(updated_at)}`}
          </div>
        </div>
      </div>
      <div className={'pr-numbers' + (PRs.total === 0 ? ' disabled' : '')}>
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
