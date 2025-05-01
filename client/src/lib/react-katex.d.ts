declare module 'react-katex' {
  import React from 'react';

  interface MathProps {
    children: string;
    math?: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => React.ReactNode;
    settings?: object;
    strict?: boolean;
  }

  export class InlineMath extends React.Component<MathProps> {}
  export class BlockMath extends React.Component<MathProps> {}
  export default InlineMath;
}