import { useEffect, useState } from 'react';
import removeIcon from '../../assets/images/close-sm-svgrepo-com.svg';
import SubmitButton from '../SubmitButton/SubmitButton.component';
import { addCommas } from '../../utils';
import { log } from '../../utils';

import './SelectedRepositories.style.scss';

const RANGE_DEFAULT_VALUE = 100;

const SelectedRepositories = ({ selectedRepos, removeRepo, submitLoadPRs }) => {
  const [selectedRepoStatus, setSelectedRepoStatus] = useState(selectedRepos);
  const [totalPRs, setTotalPRs] = useState(0);
  const [rangeValue, setRangeValue] = useState(RANGE_DEFAULT_VALUE);
  const [filterStatus, setFilterStatus] = useState({
    open: true,
    draft: true,
    merged: true,
    closed: true,
  });
  const [prColor, setPRColor] = useState({
    colorFromRepo: false,
  });
  const [submitObject, setSubmitObject] = useState({
    repos: [],
    maxNumberOfPRs: 0,
    filterStatus: {
      open: true,
      draft: true,
      merged: true,
      closed: true,
    },
    prColor: {
      colorFromRepo: false,
    },
  });

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
    setSelectedRepoStatus([
      ...selectedRepos,
    ]);
  }, [selectedRepos]);

  useEffect(() => {
    const total = selectedRepoStatus
      ?.reduce((acc, { numberOfPRs }) => acc + numberOfPRs, 0) ?? 0;
    if (totalPRs === 0 && total > 0) {
      setRangeValue(Math.min(RANGE_DEFAULT_VALUE, total));
    }
    setTotalPRs(total);
    if (rangeValue > total)
      setRangeValue(Math.max(1, total));
  }, [selectedRepoStatus.length]);

  const onChangeFilterStatus = e => {
    const name = e.currentTarget.getAttribute('name');
    const newValue = !filterStatus[name];
    // log({ [name]: newValue });
    submitObject.filterStatus[name] = newValue;
    setFilterStatus({
      ...filterStatus,
      [name]: newValue,
    });
  };

  const onChangeColorFromRepo = value => {
    submitObject.prColor.colorFromRepo = value;
    setPRColor({ colorFromRepo: value });
  };

  useEffect(() => {
    submitLoadPRs(submitObject);
  }, [submitObject]);

  const onSubmit = e => {
    e.preventDefault();

    setSubmitObject({
      repos: [...selectedRepoStatus],
      maxNumberOfPRs: rangeValue,
      filterStatus,
      prColor,
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
                title='Disabling it only hides its PRs, but still fetch the data'
                onClick={() => toggleSelectedRepo(id)}>
                <div className='selected-repo-item-name'>{`${name} (${addCommas(numberOfPRs)})`}</div>
                <div className='selected-repo-item-color' style={{ backgroundColor: color, borderColor: color }}></div>
                <div className='remove-repo' onClick={() => removeRepo(id)} title='Remove it from the list to avoid fetching the PRs'>
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
      <div className='pr-status-filter'>
        <label>Filter PRs by status:</label>
        <div
          name='open'
          className={'pr-status-filter-item status-open' + (filterStatus.open ? '' : ' disabled')}
          onClick={onChangeFilterStatus}>
          Open
        </div>
        <div
          name='draft'
          className={'pr-status-filter-item status-draft' + (filterStatus.draft ? '' : ' disabled')}
          onClick={onChangeFilterStatus}>
          Draft
        </div>
        <div
          name='merged'
          className={'pr-status-filter-item status-merged' + (filterStatus.merged ? '' : ' disabled')}
          onClick={onChangeFilterStatus}>
          Merged
        </div>
        <div
          name='closed'
          className={'pr-status-filter-item status-closed' + (filterStatus.closed ? '' : ' disabled')}
          onClick={onChangeFilterStatus}>
          Closed
        </div>
      </div>
      <div className='pr-colors'>
        <div className={'pr-colors-item' + (!prColor.colorFromRepo ? ' selected' : '')} onClick={() => onChangeColorFromRepo(false)}>
          Show the PR colors based ont their status
        </div>
        <div className={'pr-colors-item' + (prColor.colorFromRepo ? ' selected' : '')} onClick={() => onChangeColorFromRepo(true)}>
          Show repo colors on the PRs
        </div>
      </div>
    </div>
  );
};

export default SelectedRepositories;
