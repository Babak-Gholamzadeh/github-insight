import TextInput from '../../../TextInput/TextInput.component';

import './RepositoryTools.style.scss';

const RepositoryTools = ({
  title,
  html_url,
  PRs,
}) => {
  return (
    <div className="repo-tools">
      <div className='repo-search'>
        <TextInput
          label="Search"
          id="search"
          name="search"
          type="search"
          placeholder="Find a repository…"
        />
      </div>
    </div>
  );
};

export default RepositoryTools;
