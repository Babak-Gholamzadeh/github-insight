import './ListPagination.style.scss';

const PageNumber = ({ children, page, current, disabled, onClick }) => {
  return (
    <div onClick={onClick} className={'page-number' + (current ? ' curr-page' : '') + (disabled ? ' disabled' : '')} page={page}>{children}</div>
  );
};

const ListPagination = ({
  pagination,
  changePage,
}) => {
  let prevPage = null;
  let nextPage = null;
  if (pagination.last > pagination.first) {
    prevPage = <div onClick={changePage.bind(null, pagination.prev)} className={'pagination-prev' + (pagination.first === pagination.curr ? ' disabled' : '')}>Previous</div>
    nextPage = <div onClick={changePage.bind(null, pagination.next)} className={'pagination-next' + (pagination.last === pagination.curr ? ' disabled' : '')}>Next</div>;
  }

  let firstPage = null;
  let lastPage = null;
  if (pagination.last > pagination.first + 1) {
    firstPage = <PageNumber onClick={changePage.bind(null, pagination.first)} current={pagination.first === pagination.curr} key={pagination.first}>{pagination.first}</PageNumber>;
    lastPage = <PageNumber onClick={changePage.bind(null, pagination.last)} current={pagination.last === pagination.curr} key={pagination.last}>{pagination.last}</PageNumber>;
  }

  const middlePages = (() => {
    const outerRangeStart = Math.max(pagination.first + 1, pagination.curr - 5);
    const outerRangeEnd = Math.min(pagination.curr + 5, pagination.last - 1);

    let left = Math.max(outerRangeStart, pagination.curr);
    let right = Math.min(pagination.curr, outerRangeEnd);
    let totalMiddleCount = left <= pagination.curr && right >= pagination.curr ? 1 : 0;
    let isInOfRange = true;
    while (totalMiddleCount < 5 && isInOfRange) {
      isInOfRange = false;
      if (left - 1 >= outerRangeStart) {
        left--;
        totalMiddleCount++;
        isInOfRange = true;
      }
      if (right + 1 <= outerRangeEnd) {
        right++;
        totalMiddleCount++;
        isInOfRange = true;
      }
    }

    return {
      dotsBefore: pagination.first < left - 1 ? <PageNumber key={left - 1} disabled>...</PageNumber> : undefined,
      buttons: Array.from({ length: (right + 1) - left }, (_, i) => {
        const _curr = left + i;
        return <PageNumber onClick={changePage.bind(null, _curr)} current={_curr === pagination.curr} key={_curr}>{_curr}</PageNumber>
      }),
      dotsAfter: pagination.last > right + 1 ? <PageNumber key={right + 1} disabled>...</PageNumber> : undefined,
    };
  })();

  return (
    <div className='list-pagination'>
      {prevPage}
      {firstPage}
      {middlePages.dotsBefore}
      {middlePages.buttons}
      {middlePages.dotsAfter}
      {lastPage}
      {nextPage}
    </div>
  );
};

export default ListPagination;
