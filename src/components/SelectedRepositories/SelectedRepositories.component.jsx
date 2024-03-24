import { useEffect, useState } from 'react';
import removeIcon from '../../assets/images/close-sm-svgrepo-com.svg';

import './SelectedRepositories.style.scss';

const SelectedRepositories = ({ selectedRepos, removeRepo }) => {
  const [selectedRepoStatus, setSelectedRepoStatus] = useState(selectedRepos);

  const toggleSelectedRepo = repoId => {
    const repo = selectedRepoStatus.find(({ id }) => id === repoId);
    if (!repo) return;
    console.log({ enable: repo.enable });
    repo.enable = !repo.enable;
    setSelectedRepoStatus([
      ...selectedRepoStatus,
    ]);
  };

  useEffect(() => {
    setSelectedRepoStatus(selectedRepos);
  }, [selectedRepos]);

  return (
    <div className={'selected-reop-list' + (selectedRepoStatus?.length ? ' show' : '')}>
      {
        selectedRepoStatus?.map(({ id, name, color, enable }) => {
          return (
            <div key={id}
              className={'selected-repo-item' + (enable ? '' : ' disabled')}
              onClick={() => toggleSelectedRepo(id)}>
              <div className='selected-repo-item-name'>{name}</div>
              <div className='selected-repo-item-color' style={{ backgroundColor: color, borderColor: color }}></div>
              <div className='remove-repo' onClick={() => removeRepo(id)}>
                <img src={removeIcon} alt="" />
              </div>
            </div>
          );
        })
      }
    </div>
  );
};

export default SelectedRepositories;
