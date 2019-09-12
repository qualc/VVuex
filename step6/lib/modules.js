class ModuleItem {
    constructor(rawModule) {
        // 创建子 module 列表
        this._children = Object.create(null);
        // module 对象
        this._rawModule = rawModule;
        // 子 module 的 state
        this.state = rawModule.state || {};
    }
    // 添加子modules
    addChild(key, moduleItem) {
        this._children[key] = moduleItem;
    }
    getChild(key) {
        return this._children[key];
    }
    get namespaced() {
        return !!this._rawModule.namespaced;
    }
}

class Modules {
    constructor(rawModule) {
        this.register([], rawModule);
    }
    // 注册
    register(path, rawModule) {
        let newModule = new ModuleItem(rawModule);
        // 这里表示,如果namespace也就是path是空的话,是根modules
        if (path.length == 0) {
            this.root = newModule;
        } else {
            // 获取到他的前一级父元素,
            const parent = this.get(path.slice(0, -1));
            parent.addChild(path[path.length - 1], newModule);
        }
        // 如果配置有 modules 属性,递归注册
        if (rawModule.modules) {
            Object.keys(rawModule.modules).forEach(key => {
                // concat一个新数组
                this.register(path.concat(key), rawModule.modules[key]);
            });
        }
    }
    get(path) {
        // 直接拔的vuex的源码, 活到老学到老系列~~~
        // 这行代码的大概意思就是从root对象中,循环获取指定的key的属性
        // ['a', 'b'].reduce( (module, key) => module[key], {a: {b: 123} }); 执行一下试试
        return path.reduce((module, key) => module.getChild(key), this.root);
    }
    getNamespace(path) {
        // 这里呢 是通过reduce遍历path,获取到每个子model的namespace
        let module = this.root;
        return path.reduce((namespace, key) => {
            module = module.getChild(key);
            return namespace + (module.namespaced ? key + '/' : '');
        }, '');
    }
}
