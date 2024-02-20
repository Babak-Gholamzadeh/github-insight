import './Members.style.scss';

const Members = ({
  list
}) => {
  return (
    <div className="members">
      <h3 className='section-title'>Members</h3>
      <div className='member-list'>
        {list.map(({ id, html_url, avatar_url, login }) =>
          <a
            href={html_url}
            className="member-link"
            target="_blank"
            rel="noreferrer"
            title={login}
            key={id}
          >
            <img src={avatar_url} className='member-avatar' />
          </a>
        )}
      </div>
    </div>
  );
};

export default Members;
