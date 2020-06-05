const { createStore } = require('redux')
const { composeWithDevTools } = require('redux-devtools-extension')

const reduxReducer = (state = {}, action) => {
  return Object.assign({}, state, action.payload)
}

const reducAction = (name, data) => {
  return {
    type: name,
    payload: data
  }
}

const copy = (target, source) => {
  const obj = {}
  for (const t in target) obj[t] = target[t]
  for (const s in source) obj[s] = source[s]
  return obj
}

const set = (path, value, source, target) => {
  if (path.length) {
    target[path[0]] =
      path.length > 1 ? set(path.slice(1), value, source[path[0]], {}) : value
    return copy(source, target)
  }
  return value
}

const get = (path, source) => {
  for (let i = 0; i < path.length; i++) {
    source = source[path[i]]
  }
  return source
}

export default (app) => {
  const composeEnhancers = composeWithDevTools({ action: reducAction })

  return async (state, actions, view, container) => {
    const wire = (path, actions) => {
      for (const key in actions) {
        if (typeof actions[key] === 'function') {
          ((key, action) => {
            actions[key] = async function () {
              const reducer = await action.apply(this, arguments)
              return function (slice) {
                const data = typeof reducer === 'function'
                  ? reducer(slice, get(path, appActions))
                  : reducer
                if (data && !data.then) {
                  state = set(path, copy(slice, data), state, {})
                  store.dispatch(reducAction(key, state))
                }
                return data
              }
            }
          })(key, actions[key])
        } else {
          wire(path.concat(key), (actions[key] = copy(actions[key])))
        }
      }
    }
    wire([], (actions = copy(actions)))

    actions.replaceState = (actualState) => (state) => actualState
    const store = createStore(reduxReducer, state, composeEnhancers())
    store.subscribe(() => {
      appActions.replaceState(store.getState())
    })
    const appActions = await app(state, actions, view, container)

    return appActions
  }
}
