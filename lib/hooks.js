/**
 * Module exports
 */
exports.Hookable = Hookable;

/**
 * Hooks mixins for ./model.js
 */
var Hookable = require('./model.js');

Hookable.hooks = {};

/**
 * Private function for registering hooks.
 *
 * @param {String}   actionName  Name of the hook to register the callback on.
 * @param {String}   beforeAfter Extensible, but should be 'before' or 'after'.
 * @param {Function} callback    Callback to register.
 * @param {Boolean}              Was the hook registered?
 */
function register(Hookable, actionName, beforeAfter, callback) {
    'use strict';

    if (!Hookable.hooks.hasOwnProperty(actionName)) {
        Hookable.hooks[actionName] = {};
    }

    if (!Hookable.hooks.actionName.hasOwnProperty(beforeAfter)) {
        Hookable.hooks[actionName][beforeAfter] = [];
    }

    var hookList = Hookable.hooks[actionName][beforeAfter];

    // Return false if the hook was already registered.
    if (hookList.indexOf(callback) !== -1) {
        return false;
    }

    hookList.push(callback);

    return true;
}

/**
 * Register a before callback for a hook.
 *
 * @param  {String}   actionName The trigger name.
 * @param  {Function} callback   The callback function to call: (modelInstance, callback)
 * @return {Boolean}             true if the callback was added, false if not.
 */
Hookable.registerBefore = function (actionName, callback) {
    'use strict';

    return register(Hookable, actionName, 'before', callback);
};

/**
 * Register an after callback for a hook.
 *
 * @param  {String}   actionName The trigger name.
 * @param  {Function} callback   The callback function to call: (modelInstance, callback)
 * @return {Boolean}             true if the callback was added, false if not.
 */
Hookable.registerAfter = function (actionName, callback) {
    'use strict';

    return register(Hookable, actionName, 'after', callback);
};


/**
 * Remove a callback from the action. This is a private function for extensibility.
 *
 * @param  {String}   actionName  Name of the hook to unregister the callback from.
 * @param  {String}   beforeAfter Extensible, but should be 'before' or 'after'.
 * @param  {Function} callback    Callback function to unregister.
 * @return {Boolean}              false if the callback was not registered, true if it was removed.
 */
function unregister(Hookable, actionName, beforeAfter, callback) {
    'use strict';

    var callbacks = Hookable.hooks[actionName];

    if (!callbacks) {
        return false;
    }

    var hookList = callbacks[beforeAfter];

    if (!hookList) {
        return false;
    }

    var i = hookList.indexOf(callback);

    if (i === -1) {
        return false;
    }

    hookList.splice(i, 1);

    return true;
}

/**
 * Unregister a before callback for a hook.
 *
 * @param  {String}   actionName The trigger name.
 * @param  {Function} callback   The callback function to unregister.
 * @return {Boolean}             true if the callback was removed, false if not.
 */
Hookable.unregisterBefore = function (actionName, callback) {
    'use strict';

    return unregister(Hookable, actionName, 'before', callback);
};

/**
 * Unregister an after callback for a hook.
 *
 * @param  {String}   actionName The trigger name.
 * @param  {Function} callback   The callback function to unregister.
 * @return {Boolean}             true if the callback was removed, false if not.
 */
Hookable.unregisterAfter = function (actionName, callback) {
    'use strict';

    return unregister(Hookable, actionName, 'after', callback);
};

function trigger(modelInstance, actionName, beforeAfter, data, callback) {
    'use strict';

    var callbacks = Hookable.hooks[actionName];

    if (!callbacks) {
        return callback();
    }

    var hookList = Hookable.hooks[actionName][beforeAfter];

    var counter = 0;

    function run(err) {
        if (err) {
            return callback(err);
        }

        var cb = hookList[counter];

        if (typeof cb !== 'function') {
            if (counter !== hookList.length) {
                return callback(new Error('Non-function encountered in callback list: ' + cb));
            }

            return callback(); // All callbacks have been run.
        }

        counter += 1;

        cb(modelInstance, data, run);
    }

    run();
}

function triggerBefore(modelInstance, actionName, data, callback) {
    'use strict';

    trigger(modelInstance, actionName, 'before', data, callback);
}

function triggerAfter(modelInstance, actionName, data, callback) {
    'use strict';

    trigger(modelInstance, actionName, 'before', data, callback);
}


Hookable.prototype.trigger = function (actionName, work, data, callback) {
    'use strict';

    var modelInstance = this;

    function before(cb) {
        if (!work) {
            return cb();
        }

        function doWork(err) {
            if (err) {
                return cb(err);
            }

            work.call(modelInstance, cb);
        }

        if (actionName !== 'validate') {
            return triggerBefore(modelInstance, actionName, data, doWork);
        }

        modelInstance.constructor.beforeValidation.call(modelInstance, doWork, data);
    }

    function after(cb) {
        if (actionName !== 'validate') {
            return triggerBefore(modelInstance, actionName, data, cb);
        }

        modelInstance.constructor.afterValidation.call(modelInstance, cb, data);
    }

    before(function (err) {
        if (err) {
            return callback(err);
        }

        after(function (err) {
            if (err) {
                return callback(err);
            }

            callback(null, modelInstance);
        });
    });
};
