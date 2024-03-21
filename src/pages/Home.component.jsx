import { useState } from 'react';
import GitHubAPIAuthentication from '../components/GitHubAPIAuthentication/GitHubAPIAuthentication.component';
import OverviewSection from '../components/OverviewSection/OverviewSection.component';
import PullRequests from '../components/PullRequests/PullRequests.component';

import './Home.style.scss';

const HomePage = () => {
  const [auth, setAuth] = useState({
    organization: 'nodejs',
    token: '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',
  });

  return (
    <div className="page-container home-page">
      <h1 className="page-title">GitHub Insight</h1>
      <GitHubAPIAuthentication onApply={setAuth} />
      <OverviewSection auth={auth} />
      <PullRequests auth={auth} />
    </div>
  );
};

export default HomePage;
