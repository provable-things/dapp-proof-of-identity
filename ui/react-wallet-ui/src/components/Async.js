import React, {PropTypes} from 'react'

class Async extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      value: null,
      started: false,
      resolved: false,
      rejected: false
    }
  }
  componentWillReceiveProps (nP) {
    if (nP.promise !== this.props.promise) {
      this.handlePromise(nP.promise)
    }
  }
  handlePromise (prom) {
    try {
      this.setState({
        started: true
      })
      this.prom = prom;
      this.prom.then((res) => {
        if(this.mounted)
          this.setState({
            resolved: true,
            value: res,
            finished: true
          })
      }, (err) => {
        if(this.mounted)
          this.setState({
            rejected: true,
            value: err,
            finished: true
          })
      })
    } catch (e) {

    }
  }
  componentWillMount () {
    this.mounted = true;
    if (this.props.promise) {
      this.handlePromise(this.props.promise)
    }
  }
  componentWillUnmount () {
    this.mounted = false;
  }
  render () {
    const {props, state} = this
    if (state.started) {
      if (!state.finished) {
        if (props.pendingRender) {
          return props.pendingRender  // custom component to indicate load in progress
        }
        return <div></div>
      }
      if (props.then && state.resolved) {
        return props.then(state.value)
      }
      if (props.catch && state.rejected) {
        return props.catch(state.value)
      }
      else
        return null

    } else {
      return null;
    }
  }
}

Async.propTypes = {
  before: PropTypes.func, // renders its return value before promise is handled
  then: PropTypes.func, // renders its return value when promise is resolved
  catch: PropTypes.func, // renders its return value when promise is rejected
  pendingRender: PropTypes.node, // renders its value when promise is pending
  promise: PropTypes.object // promise itself
}

export default Async
