import './RepositoryPagination.style.scss';

const PageNumber = ({ children, current }) => {
  return (
    <div className={'page-number' + (current ? ' curr-page' : '')}>{children}</div>
  );
};

const RepositoryPagination = ({
  pagination
}) => {
  const firstPage = <PageNumber key={pagination.first}>{pagination.first}</PageNumber>;
  const lastPage = pagination.last > pagination.first
    ? <PageNumber key={pagination.last}>{pagination.last}</PageNumber>
    : undefined;

  const middlePages = (() => {
    const start = Math.max(pagination.first, pagination.curr - 2);
    const end = Math.min(start + 5, pagination.last);
    return {
      dotsBefore: pagination.first < start - 1 ? <PageNumber key={start - 1}>...</PageNumber> : undefined,
      buttons: Array.from({ length: end - start }, (_, i) =>
        <PageNumber current={start + i === pagination.curr} key={start + i}>{start + i}</PageNumber>
      ),
      dotsAfter: pagination.last > end + 1 ? <PageNumber key={end + 1}>...</PageNumber> : undefined,
    };
  })();

  return (
    <div className='repo-pagination'>
      <div className='pagination-prev'>Previous</div>
      {firstPage}
      {middlePages.dotsBefore}
      {middlePages.buttons}
      {middlePages.dotsAfter}
      {lastPage}
      <div className='pagination-next'>Next</div>
    </div>
  );
};

export default RepositoryPagination;
