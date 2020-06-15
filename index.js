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
              return async function (slice) {
                let data
                if (typeof reducer === 'function' && reducer.constructor.name === 'AsyncFunction') {
                  data = await reducer(slice, get(path, appActions))
                } else if (typeof reducer === 'function') {
                  data = reducer(slice, get(path, appActions))
                } else {
                  data = reducer
                }
                if (data) {
                  store.dispatch(reducAction(key, data))
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
