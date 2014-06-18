// constructor
/*
 * Permission
 */
function Permission(username) {
	var self = this;
	if (!(self instanceof Permission)) {
		throw new Error('use "new" to construct a Permission');
	}
	if (_.isString(username) && Permission.userExist(username)) {
		this.username = username;
		return;
	}
	throw new Error('user not exist');
}

/*
 * permission settings collection
 */
Permission.COLLECTION = new Meteor.Collection('Permission');

// instance method
/*
 * initial new class permission
 * true: initial success, false: initial failure
 */
Permission.prototype.newClass = function (className) {
	var self = this;
	if (_.isString(className) &&
		Permission.COLLECTION.findOne({class : className}) === undefined) {
		Permission.COLLECTION.insert({
			class : className,
			owner : {
				'user' : self.username,
				'permission' : {read : true, write : true, execute : true}
			},
			group : {
				'users' : [],
				'permission' : {read : true, write : true, execute : true}
			},
			other : {
				'permission' : {read : true, write : false, execute : true}
			}
		});
		return true;
	}
	return false;
}

/*
 * remove class permission
 * true: remove success, false: remove failure
 */
Permission.prototype.removeClass = function (className) {
	var self = this;
	return (_.isString(className)
		&& Permission.COLLECTION.remove({class : className, 'owner.user' : self.username}) > 0);
}

/*
 * get all classes which this user owned
 * return owned class name string array
 */
Permission.prototype.getOwnClasses = function () {
	var self = this;
	var result = Permission.COLLECTION
		.find(
			{'owner.user' : self.username},
			{sort : {'class' : 1}, fields : {'class' : 1}})
		.map(function (each) {return each.class;});
	return result;
}

/*
 * get class owner username
 * return owner username string, class not exist return null
 */
Permission.prototype.getOwner = function (className) {
	if (_.isString(className)) {
		var result = Permission.COLLECTION.findOne({class : className}, {fields: {'owner.user' : 1}});
		return (result && result.owner && result.owner.user && _.isString(result.owner.user))
			? result.owner.user
			: null; // database incorrect
	}
	return null;
}

/*
 * get class group users username
 * return group users username string array, class not exist return null
 */
Permission.prototype.getGroup = function (className) {
	if (_.isString(className)) {
		var result = Permission.COLLECTION.findOne({class : className}, {fields : {'group.users' : 1}});
		
		return (result && result.group && result.group.users && _.isArray(result.group.users))
			? _.filter(result.group.users, _.isString)
			: null; // database incorrect
	}
	return null;
}

/*
 * modify class owner user
 * true: modify success, false: modify failure
 */
Permission.prototype.changeOwner = function (className, user) {
	var self = this;
	if (_.isString(className) && _.isString(user) && Permission.userExist(user)) {
		return Permission.COLLECTION.update(
			{class : className, 'owner.user' : self.username},
			{$set : {'owner.user' : user}}) > 0;
	}
	return false;
}

/*
 * add users to class group users
 * true: add users success, false: add users failure
 */
Permission.prototype.addGroupUser = function (className, users) {
	var self = this;
	var users = _.filter(((_.isArray(users)) ? users : [users]),
		function (user) {
			return _.isString(user) && Permission.userExist(user);
		});
	var allUsers = null;
	// some user need add
	if (!_.isEmpty(users)
		// get now group users
		&& (allUsers = self.getGroup(className)) !== null) {
		allUsers = _.union(allUsers, users).sort();
		// overwrite users
		return Permission.COLLECTION.update(
			{class : className, 'owner.user' : self.username},
			{$set : {'group.users' : allUsers}}) > 0;
	}
	return false;
}

/*
 * remove users from class group users
 * true: remove users success, false: remove users failure
 */
Permission.prototype.removeGroupUser = function (className, users) {
	var self = this;
	var users = _.filter(((_.isArray(users)) ? users : [users]), _.isString);
	if (!_.isEmpty(users)) {
		return Permission.COLLECTION.update(
			{class : className, 'owner.user' : self.username},
			{$pullAll : {'group.users' : users}}) > 0;
	}
	return false;
}

/*
 * get class permission
 * result: {owner : {read : boolean, write, execute}, group : {...}, other : {...}},
 * class not exist return null
 */
Permission.prototype.getPermission = function (className) {
	var self = this;
	var qureyPerm = null;
	if (_.isString(className)
		&& !_.isEmpty(qureyPerm = Permission.COLLECTION.findOne(
			{class : className},
			{fields: {'owner.permission' : 1, 'group.permission' : 1, 'other.permission' : 1}}))) {
		// assume database not corrupt
		return _.chain(qureyPerm)
			// pick supported role
			.pick('owner', 'group', 'other')
			.map(function (perm, role) {
				return [role,
					// extract permission field exist
					_.chain(_.has(perm, 'permission') ? perm['permission'] : {})
						// pick supported operation
						.pick('read', 'write', 'execute')
						// filter boolean setting
						.pairs().filter(function (pair) {return _.isBoolean(pair[1])})
						.object().value()];})
			// reject empty permission
			.reject(function (pair) {return _.isEmpty(pair[1])})
			.object().value();
	}
	return null;
}

/*
 * set class permission
 * permission example: {owner : {read : boolean, write, execute}, group : {...}, other : {...}}
 * true: set permission success, false: set permission failure
 */
Permission.prototype.setPermission = function (className, permission) {
	var self = this;
	if (_.isObject(permission) && !_.isArray(permission)) {
		// generate argument object for collection update
		var perms = _.chain(permission)
			// pick supported roles
			.pick('owner', 'group', 'other')
			// only allow role's permission is object
			.pairs().filter(function (pair) {return _.isObject(pair[1]) && !_.isArray(pair[1])})
			// role pair: ['owner', {read : ...}]
			.map(function (rolePair) {
				return _.chain(rolePair[1])
					// pick supported operations
					.pick('read', 'write', 'execute')
					// only allow boolean setting
					.pairs().filter(function (pair) {return _.isBoolean(pair[1])})
					// build update set objects, example: {'owner.permission.read', true}
					.map(function (pair) {return [(rolePair[0] + '.permission.' + pair[0]), pair[1]];})
					.object().value();})
			// merge all roles set object
			.reduce(function (memo, each) {return _.extend(memo, each);}, {})
			.value();
		
		return Permission.COLLECTION.update(
			{class : className, 'owner.user' : self.username},
			{$set : perms}) > 0;
	}
	return false;
}

/*
 * check permission
 * request: {read : [classes name list], write : [...], execute : [...]}
 * return result: {read : [allowed classes name list], ...}
 * class not exist return no permission '{}' object
 */
Permission.prototype.checkPermission = function (request) {
	var self = this;
	if (_.isObject(request) && !_.isArray(request)) {
		/*
		 * convert from request form to query form object
		 * query form: {class : ['read', ...], ...}
		 */
		var requestPerms = _.chain(request)
			// pick supported operations
			.pick('read', 'write', 'execute')
			// filter string or array className
			.pairs().filter(function (pair) {
				return !_.isEmpty(pair[1]) && (_.isArray(pair[1]) || _.isString(pair[1]))})
			// convert to [className, operation] pairs
			.map(function (operationPair) {
				// convert string className to array
				operationPair[1] = (_.isArray(operationPair[1])
					? operationPair[1]
					: [operationPair[1]]);
				// filter string className elements
				operationPair[1] = _.filter(operationPair[1], _.isString);
				return _.map(operationPair[1], function (className) {
					return [className, operationPair[0]];
				});})
			// flatten pairs array
			.reduce(function (memo, each) {return _.union(memo, each)}, [])
			// eliminate duplicate pairs
			.uniq()
			// convert to request object: {className : [operations], ...}
			.reduce(function (memo, pair) {
				if (memo[pair[0]]) {
					memo[pair[0]].push(pair[1]);
				} else {
					memo[pair[0]] = [pair[1]];
				}
				return memo
			}, {})
			.value();
		
		// query all request classes permission
		var queryPerms = Permission.COLLECTION.find(
			{class : {$in : _.keys(requestPerms)}},
			{fields : {'class' : 1, 'owner' : 1, 'group' : 1, 'other' : 1}, sort : {'class' : 1}})
			.map(_.identity);
		
		var user = this.username;
		/*
		 * filter allow permission
		 * result: {class : ['read', ...], ...}
		 */
		var allowPerms = _.chain(queryPerms)
			// extract match user role permissions
			.map(function (perm) {
				// user is owner role
				if (perm.owner.user === user) {
					return [perm.class, perm.owner.permission];
				}
				// user is group role
				if (_.contains(perm.group.users, user)) {
					return [perm.class, perm.group.permission];
				}
				// user is other role
				return [perm.class, perm.other.permission];})
			// pair: [className, {read : boolean, ...}]
			.map(function (pair) {
				return [pair[0],
					_.chain(pair[1])
						// check request this operation and it allow access
						.map(function (allow, operation) {
							return (allow && _.contains(requestPerms[pair[0]], operation))
								? operation
								: null;})
						.reject(_.isEmpty)
						.value()];
			})
			// reject no permission class
			.reject(function (pair) {return _.isEmpty(pair[1])})
			// pair: [className, ['read', ...]]
			.reduce(function (memo, pair) {
				_.each(pair[1], function (operation) {
					if (memo[operation]) {
						memo[operation].push(pair[0]);
					} else {
						memo[operation] = [pair[0]];
					}});
				return memo;
			}, {})
			.value();
		return allowPerms;
	}
	return {};
}

// static method
/*
 * check username is exist
 * true: user is exist, false: user isn't exist
 */
Permission.userExist = function (username) {
	if (_.isUndefined(Package['accounts-base']) || _.isUndefined(Package['accounts-password'])) {
		throw 'Meteor.users is not defined, check accounts-* packages added';
	}
	return (Meteor.users.findOne({username : username}, {fields : {username : 1}})
		!== undefined);
}

/*
 * convert octal integer string to permission object
 * permNumber: from '000' to '777' integer string
 * return: {owner : {read : boolean, write, execute}, group : {...}, other : {...}}
 */
Permission.numberToPermission = function (permNumber) {
	if (_.isString(permNumber) && /^[0-7]{3}$/.test(permNumber)) {
		// parse string to octal integer
		permNumber = parseInt(permNumber, 8);
		
		// permission booleans
		var perms = _.map(_.range(8, -1, -1), function (offset) {
			return (((permNumber >> offset) & 1) === 1);
		});
		
		// group by role
		return _.object(['owner', 'group', 'other'],
			_.map([0, 1, 2], function (index) {
				return {
					read : perms[index * 3],
					write : perms[(index * 3) + 1],
					execute : perms[(index * 3) + 2]};
			}));
	}
	
	throw '"' + permNumber + '" permission is invalid';
}

// export
Cadabia.Permission = Permission;
