import { useEffect, useState } from 'react';
import GitHubAPIAuthentication from '../components/GitHubAPIAuthentication/GitHubAPIAuthentication.component';
import OverviewSection from '../components/OverviewSection/OverviewSection.component';
import SelectedRepositories from '../components/SelectedRepositories/SelectedRepositories.component';
import PullRequests from '../components/PullRequests/PullRequests.component';
import { getRandomColorWithName } from '../utils';

import './Home.style.scss';

const HomePage = () => {
  const [auth, setAuth] = useState({
    // owner: 'babak-gholamzadeh',
    // ownerType: 'user',
    // token: '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',
    owner: '',
    ownerType: '',
    token: '',
  });

  const [loadPRsReq, submitLoadPRs] = useState({
    repos: [],
    maxNumberOfPRs: 0,
  });

  const [selectedRepos, selectRepo] = useState([]);

  const addRepo = repo => {
    if (selectedRepos.find(({ id }) => id === repo.id)) return;
    selectRepo([
      ...selectedRepos,
      {
        ...repo,
        enable: true,
        color: getRandomColorWithName(repo.name),
      },
    ]);
  };

  const removeRepo = repoId => {
    const index = selectedRepos.findIndex(({ id }) => id === repoId);
    if (index > -1) {
      selectedRepos.splice(index, 1);
      selectRepo([
        ...selectedRepos,
      ]);
      console.log('selectedRepos:', selectedRepos);
    }
  };

  useEffect(() => {
    selectRepo([]);
  }, [auth]);

  return (
    <div className="page-container home-page">
      <h1 className="page-title">GitHub Insight</h1>
      <GitHubAPIAuthentication
        auth={auth}
        setAuth={setAuth} />
      <OverviewSection
        auth={auth}
        selectedRepos={selectedRepos}
        addRepo={addRepo}
        removeRepo={removeRepo} />
      <SelectedRepositories
        selectedRepos={selectedRepos}
        removeRepo={removeRepo}
        submitLoadPRs={submitLoadPRs} />
      <PullRequests
        auth={auth}
        loadPRsReq={loadPRsReq} />
    </div>
  );
};

export default HomePage;
