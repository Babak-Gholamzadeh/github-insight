import { useEffect, useState } from 'react';
import GitHubAPIAuthentication from '../components/GitHubAPIAuthentication/GitHubAPIAuthentication.component';
import OverviewSection from '../components/OverviewSection/OverviewSection.component';
import PullRequests from '../components/PullRequests/PullRequests.component';

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

  const [selectedRepos, selectRepo] = useState([]);

  const addRepo = repo => {
    if (selectedRepos.find(({ id }) => id === repo.id)) return;
    selectRepo([
      ...selectedRepos,
      {
        ...repo,
        enable: true,
      },
    ]);
  };

  const toggleSelectedRepo = repoId => {
    const repo = selectedRepos.find(({ id }) => id === repoId);
    if (!repo) return;
    console.log({ enable: repo.enable });
    repo.enable = !repo.enable;
    selectRepo([
      ...selectedRepos,
    ]);
  };

  useEffect(() => {
    selectRepo([]);
  }, [auth]);

  return (
    <div className="page-container home-page">
      <h1 className="page-title">GitHub Insight</h1>
      <GitHubAPIAuthentication auth={auth} setAuth={setAuth} />
      <OverviewSection auth={auth} addRepo={addRepo} />
      {/* <PullRequests auth={auth} selectedRepos={selectedRepos} toggleSelectedRepo={toggleSelectedRepo} /> */}
    </div>
  );
};

export default HomePage;
