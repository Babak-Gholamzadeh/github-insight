import './TextInput.style.scss';

const TextInput = ({label, className, ...rest}) => {
  return (
    <div className={'text-input-wrapper' + (className ? ` ${className}` : '')}>
      <input
        type='text'
        autoComplete='off'
        {...rest}
      />
    </div>
  );
};

export default TextInput;
