import { useEffect, useState } from 'react';
import removeIcon from '../../assets/images/close-sm-svgrepo-com.svg';
import SubmitButton from '../SubmitButton/SubmitButton.component';
import { addCommas } from '../../utils';

import './SelectedRepositories.style.scss';

const SelectedRepositories = ({ selectedRepos, removeRepo, submitLoadPRs }) => {
  const [selectedRepoStatus, setSelectedRepoStatus] = useState(selectedRepos);
  const [totalPRs, setTotalPRs] = useState(0);
  const [rangeValue, setRangeValue] = useState(100);

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
    // console.log('selectedRepos:', 1);
    setSelectedRepoStatus([
      ...selectedRepos,
    ]);
  }, [selectedRepos]);

  useEffect(() => {
    const total = selectedRepoStatus?.reduce((acc, { numberOfPRs }) => acc + numberOfPRs, 0);
    // console.log('selectedRepoStatus:', 2, total);
    setTotalPRs(total);
    if (rangeValue > total)
      setRangeValue(Math.max(1, total));
  }, [selectedRepoStatus]);

  const onSubmit = e => {
    e.preventDefault();
    submitLoadPRs({
      repos: [...selectedRepoStatus],
      maxNumberOfPRs: rangeValue,
    });
  };

  return (
    <div className={'selected-repo-wrapper' + (selectedRepoStatus?.length ? ' show' : '')}>
      <div className='selected-reop-list'>
        {
          selectedRepoStatus?.map(({ id, name, color, enable, numberOfPRs }) => {
            return (
              <div key={id}
                className={'selected-repo-item' + (enable ? '' : ' disabled')}
                onClick={() => toggleSelectedRepo(id)}>
                <div className='selected-repo-item-name'>{`${name} (${addCommas(numberOfPRs)})`}</div>
                <div className='selected-repo-item-color' style={{ backgroundColor: color, borderColor: color }}></div>
                <div className='remove-repo' onClick={() => removeRepo(id)}>
                  <img src={removeIcon} alt="" />
                </div>
              </div>
            );
          })
        }
      </div>
      <form onSubmit={onSubmit} className='selected-reop-tools'>
        <div className='range-area'>
          <label className='range-min' title='Minimum number of PRs to display'>1</label>
          <input id="typeinp" type="range" step="1"
            min="1" max={totalPRs} value={rangeValue} title={rangeValue}
            onChange={e => setRangeValue(e.target.value)} />
          <label className='range-max' title='Total number of PRs for selected Repos'>{totalPRs}</label>
        </div>
        <SubmitButton status='apply' title={`Loading the data for ${rangeValue} PRs`}>
          {`Load ${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'}`}
        </SubmitButton>
      </form>
    </div>
  );
};

export default SelectedRepositories;
