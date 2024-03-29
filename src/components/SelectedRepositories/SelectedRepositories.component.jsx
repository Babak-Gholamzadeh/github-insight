/* eslint-disable default-case */
import { useEffect, useState } from 'react';
import removeIcon from '../../assets/images/close-sm-svgrepo-com.svg';
import SubmitButton from '../SubmitButton/SubmitButton.component';
import { addCommas } from '../../utils';
import { log } from '../../utils';

import './SelectedRepositories.style.scss';

const RANGE_DEFAULT_VALUE = 100;
const LOAD_STATE = {
  NEEDS_TO_LOAD: 0,
  LOADING: 1,
  PAUSED: 2,
  COMPLETED: 3,
};

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
  const [numberOfLoadedPRs, setNumberOfLoadedPRs] = useState(0);
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
    loadState: (() => {
      const loadStateOp = {
        setNumberOfLoadedPRs,
        isPaused: false,
        continue() { },
      };

      loadStateOp.pause = function () {
        if (this.isPaused) return;
        this.isPaused = true;
        loadStateOp.toContinue = new Promise(resolve => {
          loadStateOp.continue = toContinue => {
            loadStateOp.isPaused = false;
            if (!toContinue) {
              setNumberOfLoadedPRs(0);
            }
            resolve(toContinue);
          };
        });
      };

      return loadStateOp;
    })(),
  });
  const [mouseHoverState, setMouseHoverState] = useState(false);
  const [loadState, setLoadDataState] = useState(LOAD_STATE.NEEDS_TO_LOAD);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const [loadButtonCaption, setLoadButtonCaption] = useState(
    `Load ${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'}`
  );

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

    setTotalPRs(total);

    if (total) {
      log({ rangeValue, total });
      setRangeValue(Math.min(rangeValue, total));
    } else {
      setRangeValue(RANGE_DEFAULT_VALUE);
    }

  }, [selectedRepoStatus.length]);

  const onChangeFilterStatus = e => {
    const name = e.currentTarget.getAttribute('name');
    const newValue = !filterStatus[name];
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

    log({ onSubmit: loadState });

    // eslint-disable-next-line default-case
    switch (loadState) {
      case LOAD_STATE.NEEDS_TO_LOAD: {
        submitObject.loadState.continue(false);
        setLoadDataState(LOAD_STATE.LOADING);
        setSubmitObject({
          ...submitObject,
          repos: [...selectedRepoStatus],
          maxNumberOfPRs: rangeValue,
          filterStatus,
          prColor,
        });
        break;
      }
      case LOAD_STATE.LOADING: {
        submitObject.loadState.pause();
        setLoadDataState(LOAD_STATE.PAUSED);
        break;
      }
      case LOAD_STATE.PAUSED: {
        submitObject.loadState.continue(true);
        setLoadDataState(LOAD_STATE.LOADING);
        break;
      }
    }
  };

  useEffect(() => {
    setLoadButtonCaption(getLoadButtonCaption());
    setLoadingPercentage(Math.floor(numberOfLoadedPRs / rangeValue * 100));
    // log({ numberOfLoadedPRs, rangeValue, loadingPercentage });
  }, [loadState, mouseHoverState, rangeValue, numberOfLoadedPRs]);

  const getLoadButtonCaption = () => {
    // eslint-disable-next-line default-case
    switch (loadState) {
      case LOAD_STATE.NEEDS_TO_LOAD:
        return `Load ${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'}`;
      case LOAD_STATE.LOADING:
        return mouseHoverState
          ? `Pause (${addCommas(numberOfLoadedPRs)}/${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'})`
          : `Loading... (${addCommas(numberOfLoadedPRs)}/${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'})`;
      case LOAD_STATE.PAUSED:
        return mouseHoverState
          ? `Continue (${addCommas(numberOfLoadedPRs)}/${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'})`
          : `Paused (${addCommas(numberOfLoadedPRs)}/${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'})`;
      case LOAD_STATE.COMPLETED:
        return `Loading ${addCommas(rangeValue)} PR${rangeValue === '1' ? '' : 's'} Completed`;
    }
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
        <SubmitButton
          onMouseOver={() => setMouseHoverState(true)}
          onMouseOut={() => setMouseHoverState(false)}
          loadedPercentage={
            loadState === LOAD_STATE.LOADING
              ? `${loadingPercentage}%`
              : null
          }
          status={(() => {
            const status = ['apply'];
            switch (loadState) {
              case LOAD_STATE.LOADING: {
                status.push('loading');
                break;
              }
              // case LOAD
            }

            return status.join(' ');
          })()}>
          {loadButtonCaption}
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
