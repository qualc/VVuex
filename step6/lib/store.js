class Store {
    constructor(options = { state: {} }) {
        // beforeCreate 钩子挂载 $store 属性
        mixin();
        // 接受传递的 state
        let { state = {} } = options;
        // 默认包装getters的对象
        this._wrappedGetters = Object.create(null);
        // mutation对象
        this._mutations = Object.create(null);
        // actions对象
        this._actions = Object.create(null);
        // modules对象
        this._modules = new Modules(options);
        this._modulesNamespaceMap = Object.create(null);

        // 介里如果没有的话  在 mapMutations 和 mapActions 时会找不到this
        let { commit, dispatch } = this;
        this.commit = function boundCommit(type, payload) {
            return commit.call(store, type, payload);
        };
        this.dispatch = function boundDispatch(type, payload) {
            return dispatch.call(store, type, payload);
        };

        // // 注册 getters
        // registerGetters(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 mutations
        // registerMutations(this, options);
        // // 注册 actions
        // registerActions(this, options);
        installModules(this, state, [], this._modules.root);

        // 注册Store
        resetStoreVM(this, state);
    }
    get state() {
        // 获取_vm上的data
        return this._vm._data.$$state;
    }
    set state(v) {
        console.log('不能直接改变state');
    }
    commit(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let mutations = this._mutations[type] || [];
        if (!mutations.length) {
            console.log(`没找到mutations  ${type}`);
            return;
        }
        // 遍历集合并执行hander
        mutations.forEach(mutationHandler => {
            mutationHandler(payload);
        });
    }
    dispatch(type, payload) {
        if (!type) return;
        // 根据key找到对应的handler集合
        let actions = this._actions[type] || [];
        if (!actions.length) {
            console.log(`没找到actions  ${type}`);
            return;
        }
        // 遍历集合并执行hander,和mutations不同的是,actions是一个promise数组
        return Promise.all(actions.map(handler => handler(payload))).then(
            res => {
                // 如果只有一个handler,直接返回第一个promise对象
                return res.length > 1 ? res : res[0];
            }
        );
    }
}
function registerGetters(store, rawModules, namespace, local) {
    // 遍历 rawModules 上的 getters 属性
    let getters = rawModules._rawModule.getters || {};
    Object.keys(getters).forEach(key => {
        // 拼接key
        let namespacedType = namespace + key;
        // 存储一个函数于_wrappedGetters[key]上，执行时实时传递传入 state 对象和 getters对象
        store._wrappedGetters[namespacedType] = function wrappedGetter(store) {
            // 执行 getters， 传递 state 和 getters
            return getters[key](
                local.state,
                local.getters,
                store.state,
                store.getters
            );
        };
    });
}
function registerMutations(store, rawModules, namespace, local) {
    // 遍历 rawModules 上的 mutations 属性
    let mutations = rawModules._rawModule.mutations || {};
    Object.keys(mutations).forEach(key => {
        // 拼接key
        let namespacedType = namespace + key;
        let mutation =
            store._mutations[namespacedType] ||
            (store._mutations[namespacedType] = []);
        // 将当前handler存入store._mutations中
        mutation.push(function wrappedMutations(payload) {
            mutations[key].call(store, local.state, payload);
        });
    });
}
function registerActions(store, rawModules, namespace, local) {
    // 遍历 rawModules 上的 mutations 属性
    let actions = rawModules._rawModule.actions || {};
    Object.keys(actions).forEach(key => {
        // 拼接key
        let namespacedType = namespace + key;
        let mutation =
            store._actions[namespacedType] ||
            (store._actions[namespacedType] = []);
        // 将当前handler存入store._actions中,返回的是promise对象
        mutation.push(function wrappedMutations(payload, cb) {
            // 调用并传入 dispatch commit getters state四个属性
            let res = actions[key].call(
                store,
                {
                    dispatch: function(type, payload) {
                        // 为了保证执行dispatch时的作用域
                        local.dispatch(type, payload);
                    },
                    commit: function(type, payload) {
                        // 同理
                        local.commit(type, payload);
                    },
                    getters: local.getters,
                    state: local.state,
                    rootGetters: store.getters,
                    rootState: store.state
                },
                payload
            );
            // 如果返回的不是一个promise对象,就转换为一个promise对象
            if (!(res && typeof val.then === 'function')) {
                res = Promise.resolve(res);
            }
            return res;
        });
    });
}
function registerModules(store, rootState, path, rawModules) {
    // 遍历 rawModules 上的 modules 属性
    // 递归注册modules
    Object.keys(rawModules._children || {}).forEach(key => {
        installModules(
            store,
            rootState,
            path.concat(key),
            rawModules._children[key]
        );
    });
}
function installModules(store, rootState, path, rawModules) {
    // 获取到 namespace
    let namespace = store._modules.getNamespace(path);
    if (rawModules.namespaced) {
        store._modulesNamespaceMap[namespace] = rawModules;
    }
    // 不是根 state,就将rawModules挂载到state上去

    if (path.length) {
        let parentState = getNestedState(rootState, path.slice(0, -1));
        // 这个不懂阔以看vue api  https://cn.vuejs.org/v2/api/#Vue-set
        Vue.set(parentState, path.slice(-1), rawModules.state);
    }
    const local = (rawModules.context = makeLocalContext(
        store,
        namespace,
        path
    ));

    // 注册 getters
    registerGetters(store, rawModules, namespace, local);
    // 注册 mutations
    registerMutations(store, rawModules, namespace, local);
    // 注册 actions
    registerActions(store, rawModules, namespace, local);
    // 注册 modules,
    registerModules(store, rootState, path, rawModules);
}
function resetStoreVM(store, state) {
    const wrappedGetters = store._wrappedGetters;
    const computed = {};
    // 为store挂载getter对象
    store.getters = {};
    Object.keys(wrappedGetters).forEach(key => {
        // 挂载在 computed 钩子上， 当state发生改变时，重新触发执行getters
        computed[key] = function() {
            return wrappedGetters[key](store);
        };
        Object.defineProperty(store.getters, key, {
            get: () => store._vm[key],
            enumerable: true // for local getters
        });
    });

    // 利用Vue数据劫持的原理,监听state的变化
    store._vm = new Vue({
        data: {
            $$state: state
        },
        // 挂载getters
        computed
    });
}

function makeLocalContext(store, namespace, path) {
    const noNamespace = namespace === '';
    /*
        定义一个对象，存储commit 和 dispatch 方法
        commit 和 dispatch 是通知 mutations 和 actions 的接口
        而命名空间下的 mutations 和 actions 是直接被解析在根目录的,例:
        {
            mudules:{
                user:{
                    namespaced: true,
                    mutaions:{
                        'setList': function(){}
                    }
                }
            }
        }
        执行后会变为
        {
            stats:{...},
            mutaions:{
                'user/setList': [f]
            }
        }
        所以 commit 通知的type直接拼接 namespace就可以了
    */
    let local = {
        commit: noNamespace
            ? store.commit
            : (type, payload) => {
                  type = namespace + type;
                  return store.commit(type, payload);
              },
        dispatch: noNamespace
            ? store.dispatch
            : (type, payload) => {
                  type = namespace + type;
                  return store.dispatch(type, payload);
              }
    };
    // 挂载  getters 和 state 到 local 上
    Object.defineProperties(local, {
        // getters 和上面解析后的结构是一样的,不同的点在于他需要
        getters: {
            get: noNamespace
                ? () => store.getters
                : () => makeLocalGetters(store, namespace, path)
        },
        state: {
            get: () => getNestedState(store.state, path)
        }
    });
    return local;
}
function makeLocalGetters(store, namespace) {
    const gettersProxy = {};
    console.log(namespace);
    // 筛选出符合当前 namespace 的getters
    Object.keys(store.getters).forEach(type => {
        Object.defineProperty(gettersProxy, namespace, {
            get: () => store.getters[type],
            enumerable: true
        });
    });

    return gettersProxy;
}
function getNestedState(state, path) {
    return path.length ? path.reduce((state, key) => state[key], state) : state;
}

function mixin() {
    // 在 vue created之前挂载 $store, 保证每个组件都有$store属性，也就是能访问store对象
    Vue.mixin({
        beforeCreate: function() {
            /*  this.$options 不多说了，options.store就是new实例的时候传递的那个store啦
            new Vue({
                ...
                store
            })
            */
            const options = this.$options;
            if (options.store) {
                this.$store = options.store;
            } else if (options.parent && options.parent.$store) {
                this.$store = options.parent.$store;
            }
        }
    });
}
