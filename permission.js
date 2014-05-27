// constructor
/*
 * Permission
 */
function Permission(username) {
	var self = this;
	if (!(self instanceof Permission)) {
		throw new Error('use "new" to construct a Permission');
	}
	this.username = username;
}

/*
 * define permission collection
 */
Permission.COLLECTION = {
	'create'	: new Meteor.Collection('CreatePermission'),
	'read'		: new Meteor.Collection('ReadPermission'),
	'update'	: new Meteor.Collection('UpdatePermission'),
	'delete'	: new Meteor.Collection('DeletePermission')
};

// instance method
/*
 * check permission
 * true: all permission allow
 * false: at least one permission deny
 */
Permission.prototype.checkPermission = function (request) {
	var self = this;
	request = Permission.cleanRequest(request);
	if (!_.isEmpty(request)) {
		var operatorsCheck = _.map(request, function (classes, operator) {
			var allowClasses = Permission.COLLECTION[operator]
				// filter this user
				.find({username : self.username})
				// collect all classes
				.map(function (each) {return each.class;});
			
			// (A == B) => (A - (A ^ B)) == 0
			return _.isEmpty(
				_.difference(
					classes,
					_.intersection(classes, allowClasses)));
		});
		return _.every(operatorsCheck, function (each) {return each === true;});
	}
	return false;
}

/*
 * add permission rule
 * true: at least one permission rule added
 * false: no any permission rule add
 */
Permission.prototype.addPermission = function (request) {
	var self = this;
	request = Permission.cleanRequest(request);
	if (!_.isEmpty(request)) {
		var result = false;
		_.each(request, function (classes, operator) {
			_.each(classes, function (clazz) {
				// check rule not yet exist
				var rule = {username : self.username, class : clazz};
				if (_.isEmpty(Permission.COLLECTION[operator].findOne(rule))) {
					Permission.COLLECTION[operator].insert(rule);
					result = true;
				}
			});
		});
		return result;
	}
	return false;
}

/*
 * remove permission rule
 * true: at least one permission rule removed
 * false: no any permission rule remove
 */
Permission.prototype.removePermission = function (request) {
	var self = this;
	request = Permission.cleanRequest(request);
	if (!_.isEmpty(request)) {
		var result = false;
		_.each(request, function (classes, operator) {
			_.each(classes, function (clazz) {
				if (Permission.COLLECTION[operator].remove(
					{username : self.username, class : clazz}) > 0) {
					result = true;
				}
			});
		});
		return result;
	}
	return false;
}

// static method
/*
 * get username by Meteor userId
 */
Permission.getUsername = function (userId) {
	var user = Meteor.users.findOne({_id: userId});
	return (user !== null)
		? user.username
		: null;
}

/*
 * clean request format
 * format: {create: [], read: [], update: [], delete: []}
 */
Permission.cleanRequest = function (request) {
	if (_.isObject(request)) {
		return _.object(
			_.filter(
				_.map(
					// pick supported operation
					_.pick(request, 'create', 'read', 'update', 'delete'),
					function (classes, operator) {
						// convert classes to array
						if (!_.isArray(classes)) {
							classes = [classes];
						}
						// class name only allow not empty string
						classes = _.filter(classes,
							function (each) {return _.isString(each) && each !== '';}
						);
						return [operator, classes];
				}),
				// class list not empty
				function (pair) {return !_.isEmpty(pair[1])}));
	}
	return {};
}

// export
Cadabia.Permission = Permission;
