import PullRequestItem from './PullRequestItem/PullRequestItem.component';

import './PullRequests.style.scss';

const PullRequests = () => {
  const list = [
    {
      state: '',
      title: '',
      html_url: '',
      user: {
        name: '',
        avatar_url: '',
        html_url: ''
      },
      repo: {
        full_name: '',
        html_url: ''
      },
      longRunning: 0,
      created_at: '',
      closed_at: null
    },
  ];

  const noItem = <div className="no-item">There is nothing here!</div>;
  const items = list && list.map(({ title, ...rest }) => <PullRequestItem {...rest} key={title} />);

  return (
    <div className="pull-requests">
      <h3 className='section-title'>Long-running Pull Requests</h3>
      <div className="pr-list">
        {list?.length ? items : noItem}
      </div>
    </div>
  );
};

export default PullRequests;
