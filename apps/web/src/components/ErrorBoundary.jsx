import { Component } from 'react';
import { errorReport } from '../lib/errorReport.js';

// Catches what throws while its children are drawn, so one broken part shows
// its fallback and the rest of the app keeps working: with nothing to catch
// it, React takes the whole tree down and leaves a blank page. Only a class
// can catch this in React. `where` names the part in the console and in the
// report a person copies; a new `resetKey` (another job, another page) gives
// the children a fresh try, as the fallback's `retry` does by hand. A throw
// in a click handler or a fetch is not a drawing error and never reaches here.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, components: '' };
    this.retry = () => this.setState({ error: null, components: '' });
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ components: info?.componentStack ?? '' });
    console.error(`JobDekho could not show ${this.props.where}.`, error);
  }

  componentDidUpdate(previous) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.retry();
  }

  render() {
    const { error, components } = this.state;
    if (!error) return this.props.children;
    const report = errorReport({ where: this.props.where, error, components });
    return this.props.fallback({ error, report, retry: this.retry });
  }
}
