import { useEffect, useState } from 'react';
import GitHubAPIAuthentication from '../components/GitHubAPIAuthentication/GitHubAPIAuthentication.component';
import OverviewSection from '../components/OverviewSection/OverviewSection.component';
import SelectedRepositories from '../components/SelectedRepositories/SelectedRepositories.component';
import PullRequests from '../components/PullRequests/PullRequests.component';

import './Home.style.scss';

const repoColors = {
  colors: [
    ['#FF0000', false], // Red
    ['#00FF00', false], // Lime
    ['#0000FF', false], // Blue
    ['#FFFF00', false], // Yellow
    ['#FF00FF', false], // Fuchsia
    ['#00FFFF', false], // Cyan
    ['#FFA500', false], // Orange
    ['#FF4500', false], // OrangeRed
    ['#8A2BE2', false], // BlueViolet
    ['#FF69B4', false], // HotPink
    ['#8B4513', false], // Dark Brown
    ['#6B8E23', false], // OliveDrab
    ['#4682B4', false], // SteelBlue
    ['#F0E68C', false], // Khaki
    ['#800000', false], // Maroon
    ['#FFFFFF', false], // White
  ],
  freeAllColors() {
    this.colors.forEach(color => color[1] = false);
  },
  freeColor(hex) {
    const color = this.colors.find(color => color[0] === hex);
    if (!color) return;
    color[1] = false;
  },
  getColor() {
    const avaliableColor = this.colors.find(([, isOccupied]) => !isOccupied);
    // if (!avaliableColor) return;
    avaliableColor[1] = true;
    return avaliableColor[0];
  },
};


const HomePage = () => {
  const [auth, setAuth] = useState({
    owner: '',
    ownerType: '',
    token: '',
  });
  const [loadPRsReq, submitLoadPRs] = useState({
    repos: [],
    maxNumberOfPRs: 0,
  });
  const [selectedRepos, selectRepo] = useState([]);
  const [isRepoListFull, setRepoListFullState] = useState(false);

  const addRepo = repo => {
    if (isRepoListFull) return;
    if (selectedRepos.find(({ id }) => id === repo.id)) return false;
    selectRepo([
      ...selectedRepos,
      {
        ...repo,
        enable: true,
        color: repoColors.getColor(),
      },
    ]);
    if (selectedRepos.length + 1 >= repoColors.colors.length)
      setRepoListFullState(true);
  };

  const removeRepo = repoId => {
    const index = selectedRepos.findIndex(({ id }) => id === repoId);
    if (index === -1) return;
    repoColors.freeColor(selectedRepos[index].color);
    selectedRepos.splice(index, 1);
    selectRepo([
      ...selectedRepos,
    ]);
    console.log('selectedRepos:', selectedRepos);
    if (isRepoListFull) setRepoListFullState(false);
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
        isRepoListFull={isRepoListFull}
        submitLoadPRs={submitLoadPRs} />
      <PullRequests
        auth={auth}
        loadPRsReq={loadPRsReq} />
    </div>
  );
};

export default HomePage;
