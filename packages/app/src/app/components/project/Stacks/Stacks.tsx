// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from 'react';

interface IStacksProps {
  children: React.ReactNode[];
}

class Stacks extends React.Component<IStacksProps> {
  render() {
    return <div id="stacks">{this.props.children}</div>;
  }
}

export default Stacks;
