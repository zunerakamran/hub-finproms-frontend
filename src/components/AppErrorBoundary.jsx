/* eslint-disable react/prop-types */
import { Component } from 'react'
import { reportSystemError } from '../utils/systemErrorReporter'

/**
 * Catches React render errors, reports them to System errors, and shows a recovery UI.
 */
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Something went wrong.',
    }
  }

  componentDidCatch(error, info) {
    reportSystemError({
      message: error?.message || 'React render error',
      name: error?.name || 'ReactError',
      stack: error?.stack,
      properties: {
        type: 'react.boundary',
        component_stack: info?.componentStack
          ? String(info.componentStack).slice(0, 4000)
          : undefined,
      },
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-error-boundary" role="alert">
          <h1>Something went wrong</h1>
          <p className="muted">
            This issue was logged automatically for the team. You can try again or reload the page.
          </p>
          {this.state.message ? <p className="app-error-boundary__msg">{this.state.message}</p> : null}
          <div className="app-error-boundary__actions">
            <button type="button" className="btn primary" onClick={this.handleReload}>
              Reload
            </button>
            <button type="button" className="btn ghost" onClick={this.handleReset}>
              Try continue
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
