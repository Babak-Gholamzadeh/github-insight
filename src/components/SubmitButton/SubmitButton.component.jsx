import './SubmitButton.style.scss';

const SubmitButton = ({ children, disabled, status, onMouseOver, onMouseOut, loadedPercentage, rest }) => {
  return (
    <div className='submit-button-wrapper'>
      <button
        className={
          'submit-button' +
          (disabled ? ' disabled' : '') +
          ` ${status}`
        }
        type='submit'
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
        {...rest}
      >
        {children}
      </button>
      {
        loadedPercentage
          ? <div
            style={{ width: loadedPercentage }}
            className='loading-button'></div>
          : null
      }
    </div>
  );
};

export default SubmitButton;
