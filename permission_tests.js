/*
 * erase database permission collection
 */
function clearPermission() {
	if (Cadabia.Permission.COLLECTION._name == 'Permission_test') {
		Cadabia.Permission.COLLECTION.remove({});
	} else {
		throw 'Error: try remove collection "' + Cadabia.Permission.COLLECTION._name + '"';
	}
}

Tinytest.add('Permission - setup', function (test) {
	// database collection for tests
	if (Cadabia.Permission.COLLECTION._name !== 'Permission_test') {
		Cadabia.Permission.COLLECTION = new Meteor.Collection('Permission_test');
	}
	test.equal(Cadabia.Permission.COLLECTION._name, 'Permission_test');
	
	// require account-base and account-password packages
	var checkPackages = !_.isUndefined(Package['accounts-base']) && !_.isUndefined(Package['accounts-password']);
	test.isTrue(checkPackages);
	// create users for tests
	if (checkPackages) {
		if (Meteor.users.findOne({username : 'user1'}) === undefined) {
			Accounts.createUser({username : 'user1', password : 'user1'});
		}
		if (Meteor.users.findOne({username : 'user2'}) === undefined) {
			Accounts.createUser({username : 'user2', password : 'user2'});
		}
		if (Meteor.users.findOne({username : 'user3'}) === undefined) {
			Accounts.createUser({username : 'user3', password : 'user3'});
		}
	}
});

Tinytest.add('Permission - new Permission', function (test) {
	test.isNotNull(new Cadabia.Permission('user1'));
	test.isNotNull(new Cadabia.Permission('user2'));
	
	try {
		new Cadabia.Permission('user');
		test.isFalse(true, 'new Permission() should be fail');
	} catch (e) {
		test.isFalse(false);
	}
	
	try {
		new Cadabia.Permission(null);
		test.isFalse(true, 'new Permission() should be fail');
	} catch (e) {
		test.isFalse(false);
	}
	
	try {
		Cadabia.Permission('user');
		test.isFalse(true, 'Permission() should be fail');
	} catch (e) {
		test.isFalse(false);
	}
});

Tinytest.add('Permission - newClass', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	test.isTrue(perm.newClass('class1'));
	
	var result = _.pick(
		Cadabia.Permission.COLLECTION.findOne({class : 'class1'}),
		'class', 'owner', 'group', 'other');
	var class1 = {
		class: 'class1',
		owner: {user: 'user1', permission: {read: true, write: true, execute: true}},
		group: {users: [], permission: {read: true, write: true, execute: true}},
		other: {permission: {read: true, write: false, execute: true}}};
	test.equal(result, class1);
	
	// same class name
	test.isFalse(perm.newClass('class1'));
	
	// another user try new same class name
	perm = new Cadabia.Permission('user2');
	test.isFalse(perm.newClass('class1'));
	
	test.isTrue(perm.newClass('class2'));
	test.isFalse(perm.newClass('class2'));
	
	test.isFalse(perm.newClass(null));
	test.isFalse(perm.newClass(0));
	test.isFalse(perm.newClass(['a', 'b', 'c']));
	test.isFalse(perm.newClass({k : 'v'}));
});

Tinytest.add('Permission - removeClass', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	// class not yet exist
	test.isFalse(perm.removeClass('class1'));
	
	perm.newClass('class1');
	test.isTrue(perm.removeClass('class1'));
	
	test.isFalse(perm.removeClass('class1'));
	
	// another user try remove class
	perm.newClass('class1');
	perm = new Cadabia.Permission('user2');
	test.isFalse(perm.removeClass('class1'));
	
	perm.newClass('class2');
	test.isTrue(perm.removeClass('class2'));
	test.isFalse(perm.removeClass('class2'));
	
	test.isFalse(perm.removeClass(null));
	test.isFalse(perm.removeClass(0));
	test.isFalse(perm.removeClass(['a', 'b', 'c']));
	test.isFalse(perm.removeClass({k : 'v'}));
});

Tinytest.add('Permission - getOwner', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	// class not yet exist
	test.equal(perm.getOwner('class1'), null);
	
	perm.newClass('class1');
	test.equal(perm.getOwner('class1'), 'user1');
	
	// query by another user
	perm = new Cadabia.Permission('user2');
	test.equal(perm.getOwner('class1'), 'user1');
	test.equal(perm.getOwner('class2'), null);
	
	test.equal(perm.getOwner(null), null);
	test.equal(perm.getOwner(0), null);
	test.equal(perm.getOwner(['a', 'b', 'c']), null);
	test.equal(perm.getOwner({k : 'v'}), null);
});

Tinytest.add('Permission - getGroup', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	// class not yet exist
	test.equal(perm.getGroup('class1'), null);
	
	perm.newClass('class1');
	test.equal(perm.getGroup('class1'), []);
	
	// query by another user
	perm = new Cadabia.Permission('user2');
	test.equal(perm.getGroup('class1'), []);
	
	test.equal(perm.getGroup('class2'), null);
	test.equal(perm.getGroup(null), null);
	test.equal(perm.getGroup(0), null);
	test.equal(perm.getGroup(['a', 'b', 'c']), null);
	test.equal(perm.getGroup({k : 'v'}), null);
});

Tinytest.add('Permission - changeOwner', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	perm.newClass('class1');
	test.equal(perm.getOwner('class1'), 'user1');
	// change to self
	test.isTrue(perm.changeOwner('class1', 'user1'));
	
	test.isTrue(perm.changeOwner('class1', 'user2'));
	test.equal(perm.getOwner('class1'), 'user2');
	
	// change not owned class
	test.isFalse(perm.changeOwner('class1', 'user1'));
	test.isFalse(perm.changeOwner('class1', 'user2'));
	
	// another user
	perm = new Cadabia.Permission('user2');
	// change to self
	test.isTrue(perm.changeOwner('class1', 'user2'));
	test.isTrue(perm.changeOwner('class1', 'user1'));
	test.equal(perm.getOwner('class1'), 'user1');
	
	// change not owned class
	test.isFalse(perm.changeOwner('class1', 'user1'));
	test.isFalse(perm.changeOwner('class1', 'user2'));
	
	perm.newClass('class2');
	test.isFalse(perm.changeOwner('class2', 'not_exist_user'));
	test.isFalse(perm.changeOwner('class2', null));
	test.isFalse(perm.changeOwner('class2', 0));
	test.isFalse(perm.changeOwner('class2', ['a', 'b', 'c']));
	test.isFalse(perm.changeOwner('class2', {k : 'v'}));
	
	test.isFalse(perm.changeOwner('class3', 'user1'));
	test.isFalse(perm.changeOwner(null, 'user1'));
	test.isFalse(perm.changeOwner(0, 'user1'));
	test.isFalse(perm.changeOwner(['a', 'b', 'c'], 'user1'));
	test.isFalse(perm.changeOwner({k : 'v'}, 'user1'));
});

Tinytest.add('Permission - addGroupUser', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	perm.newClass('class1');
	test.equal(perm.getGroup('class1'), []);
	
	test.isTrue(perm.addGroupUser('class1', 'user3'));
	test.equal(perm.getGroup('class1'), ['user3']);
	
	test.isTrue(perm.addGroupUser('class1', ['user2']));
	test.equal(perm.getGroup('class1'), ['user2', 'user3']);
	
	test.isTrue(perm.addGroupUser('class1', ['user2', 'user1', 'user3']));
	test.equal(perm.getGroup('class1'), ['user1', 'user2', 'user3']);
	
	// add exist user
	test.isTrue(perm.addGroupUser('class1', 'user1'));
	test.isTrue(perm.addGroupUser('class1', ['user2', 'user3']));
	
	// another user
	perm = new Cadabia.Permission('user2');
	test.equal(perm.getGroup('class1'), ['user1', 'user2', 'user3']);
	// add user to not owned class group
	test.isFalse(perm.addGroupUser('class1', 'user1'));
	test.isFalse(perm.addGroupUser('class1', ['user2']));
	
	perm.newClass('class2');
	test.isFalse(perm.addGroupUser('class2', 'not_exist_user'));
	test.isFalse(perm.addGroupUser('class2', ['u1', 'u2', 'u3']));
	test.isFalse(perm.addGroupUser('class2', null));
	test.isFalse(perm.addGroupUser('class2', 0));
	test.isFalse(perm.addGroupUser('class2', {k : 'v'}));
	
	test.isFalse(perm.addGroupUser('class3', 'user1'));
	test.isFalse(perm.addGroupUser(null, 'user1'));
	test.isFalse(perm.addGroupUser(0, 'user1'));
	test.isFalse(perm.addGroupUser(['a', 'b', 'c'], 'user1'));
	test.isFalse(perm.addGroupUser({k : 'v'}, 'user1'));
});

Tinytest.add('Permission - removeGroupUser', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	perm.newClass('class1');
	perm.addGroupUser('class1', ['user1', 'user2', 'user3']);
	test.equal(perm.getGroup('class1'), ['user1', 'user2', 'user3']);
	// remove not exist user
	test.isTrue(perm.removeGroupUser('class1', 'not_exist_user'));
	
	test.isTrue(perm.removeGroupUser('class1', 'user2'));
	test.equal(perm.getGroup('class1'), ['user1', 'user3']);
	// remove again
	test.isTrue(perm.removeGroupUser('class1', 'user2'));
	
	test.isTrue(perm.removeGroupUser('class1', ['user1']));
	test.equal(perm.getGroup('class1'), ['user3']);
	
	test.isTrue(perm.removeGroupUser('class1', ['user2', 'user1', 'user3']));
	test.equal(perm.getGroup('class1'), []);
	
	perm.addGroupUser('class1', ['user1', 'user2', 'user3']);
	test.equal(perm.getGroup('class1'), ['user1', 'user2', 'user3']);
	
	test.isTrue(perm.removeGroupUser('class1', ['user3', 'user1']));
	test.equal(perm.getGroup('class1'), ['user2']);
	
	// another user
	perm = new Cadabia.Permission('user2');
	test.isFalse(perm.removeGroupUser('class1', 'user2'));
	test.isFalse(perm.removeGroupUser('class1', ['user1', 'user3']));
	
	perm.newClass('class2');
	test.isTrue(perm.removeGroupUser('class2', 'user1'));
	
	// remove not exist users
	test.isTrue(perm.removeGroupUser('class2', ['a', 'b', 'c']));
	test.isFalse(perm.removeGroupUser('class2', null));
	test.isFalse(perm.removeGroupUser('class2', 0));
	test.isFalse(perm.removeGroupUser('class2', {k : 'v'}));
	
	test.isFalse(perm.removeGroupUser('class3', 'user1'));
	test.isFalse(perm.removeGroupUser(0, 'user1'));
	test.isFalse(perm.removeGroupUser(['a', 'b', 'c'], 'user1'));
	test.isFalse(perm.removeGroupUser({k : 'v'}, 'user1'));
});

Tinytest.add('Permission - getPermission', function (test) {
	clearPermission();
	
	var dafaultPerm = Cadabia.Permission.numberToPermission('775');
	
	var perm = new Cadabia.Permission('user1');
	perm.newClass('class1');
	test.equal(perm.getPermission('class1'), dafaultPerm);
	
	// another user
	perm = new Cadabia.Permission('user2');
	// get not owned class permission
	test.equal(perm.getPermission('class1'), dafaultPerm);
	
	perm.newClass('class2');
	test.equal(perm.getPermission('class2'), dafaultPerm);
	
	test.equal(perm.getPermission('class3'), null);
	test.equal(perm.getPermission(null), null);
	test.equal(perm.getPermission(0), null);
	test.equal(perm.getPermission(['a', 'b', 'c']), null);
	test.equal(perm.getPermission({k : 'v'}), null);
});

Tinytest.add('Permission - setPermission', function (test) {
	clearPermission();
	
	var nToP = Cadabia.Permission.numberToPermission;
	var dafaultPerm = nToP('775');
	
	var perm = new Cadabia.Permission('user1');
	perm.newClass('class1');
	test.equal(perm.getPermission('class1'), dafaultPerm);
	
	// full permission setting
	var perms = nToP('123');
	test.isTrue(perm.setPermission('class1', perms));
	test.equal(perm.getPermission('class1'), perms);
	
	perms = nToP('654');
	test.isTrue(perm.setPermission('class1', perms));
	test.equal(perm.getPermission('class1'), perms);
	
	perms = nToP('777');
	test.isTrue(perm.setPermission('class1', perms));
	test.equal(perm.getPermission('class1'), perms);
	
	perms = nToP('000');
	test.isTrue(perm.setPermission('class1', perms));
	test.equal(perm.getPermission('class1'), perms);
	
	// partial permission setting
	perm.newClass('class2');
	perms = nToP('000');
	test.isTrue(perm.setPermission('class2', perms));
	test.equal(perm.getPermission('class2'), perms);
	
	test.isTrue(perm.setPermission('class2',
		{owner : {read : true, write : true, execute : true}}));
	test.equal(perm.getPermission('class2'), nToP('700'));
	
	// also test operations reorder
	test.isTrue(perm.setPermission('class2',
		{owner : {read : false, execute : false, write: false},
		group : {write : true, read : true, execute : true}}));
	test.equal(perm.getPermission('class2'), nToP('070'));
	
	test.isTrue(perm.setPermission('class2',
		{group : {write : false, execute : false, read : false},
		other : {execute : true, read : true, write : true}}));
	test.equal(perm.getPermission('class2'), nToP('007'));
	
	test.isTrue(perm.setPermission('class2',
		{other : {execute : false, write : false, read : false}}));
	test.equal(perm.getPermission('class2'), nToP('000'));
	
	// more small grain setting
	test.isTrue(perm.setPermission('class2',
		{owner : {read : true}, group : {write : true}, other : {execute : true}}));
	test.equal(perm.getPermission('class2'), nToP('421'));
	
	test.isTrue(perm.setPermission('class2',
		{owner : {read : false, write : true},
		group : {write : false, execute : true},
		other : {execute : false, read : true}}));
	test.equal(perm.getPermission('class2'), nToP('214'));
	
	test.isTrue(perm.setPermission('class2',
		{owner : {write : false, execute : true},
		group : {execute : false, read : true},
		other : {read : false, write : true}}));
	perms = nToP('142');
	test.equal(perm.getPermission('class2'), perms);
	
	// modify nothing
	test.isTrue(perm.setPermission('class2', {}));
	test.equal(perm.getPermission('class2'), perms);
	
	// anomaly argument
	test.isTrue(perm.setPermission('class2', {k : 'v'}));
	test.equal(perm.getPermission('class2'), perms);
	
	test.isTrue(perm.setPermission('class2',
		{owner : {}, group : null, other : true, noUser : {read : true}}));
	test.equal(perm.getPermission('class2'), perms);
	
	test.isTrue(perm.setPermission('class2',
		{owner : {read : true, write : 0, execute : {}},
		group : {read : null, write : [], execute : true},
		other : {a : true, b : false, write : false}}));
	test.equal(perm.getPermission('class2'), nToP('550'));
	
	test.isFalse(perm.setPermission('class1', null));
	test.isFalse(perm.setPermission('class1', 0));
	test.isFalse(perm.setPermission('class1', ['a', 'b', 'c']));
	
	// another user
	perm = new Cadabia.Permission('user2');
	// modify not owned class permission
	test.isFalse(perm.setPermission('class1', nToP('000')));
	test.isFalse(perm.setPermission('class1', {}));
	
	perm.newClass('class3');
	test.isTrue(perm.getPermission('class3', dafaultPerm));
	test.isTrue(perm.setPermission('class3', perms));
	test.isTrue(perm.getPermission('class3'), perms);
});

Tinytest.add('Permission - getOwnClasses', function (test) {
	clearPermission();
	
	var perm = new Cadabia.Permission('user1');
	test.equal(perm.getOwnClasses(), []);
	
	perm.newClass('classB');
	test.equal(perm.getOwnClasses(), ['classB']);
	
	perm.newClass('classC');
	perm.newClass('classA');
	test.equal(perm.getOwnClasses(), ['classA', 'classB', 'classC']);
	
	perm = new Cadabia.Permission('user2');
	test.equal(perm.getOwnClasses(), []);
	
	perm.newClass('class2');
	perm.newClass('class3');
	perm.newClass('class1');
	test.equal(perm.getOwnClasses(), ['class1', 'class2', 'class3']);
});

Tinytest.add('Permission - checkPermission', function (test) {
	clearPermission();
	
	var nToP = Cadabia.Permission.numberToPermission;
	var request = function (read, write, execute) {
		var result = {};
		if (read) {
			result = _.extend(result, {read : read});
		}
		if (write) {
			result = _.extend(result, {write : write});
		}
		if (execute) {
			result = _.extend(result, {execute : execute});
		}
		return result;
	}
	var dafaultPerm = nToP('775');
	
	var perm1 = new Cadabia.Permission('user1');
	perm1.newClass('class1');
	test.equal(perm1.getPermission('class1'), dafaultPerm);
	perm1.newClass('class2');
	test.equal(perm1.getPermission('class2'), dafaultPerm);
	
	// empty request
	test.equal(perm1.checkPermission('class1', {}), {});
	
	var requestPerm = request(['class1'], ['class1'], ['class1']);
	test.equal(perm1.checkPermission(requestPerm), requestPerm);
	
	requestPerm = request(['class2'], ['class2'], ['class2']);
	test.equal(perm1.checkPermission(requestPerm), requestPerm);
	
	requestPerm = request(['class1', 'class2'], ['class1', 'class2'], ['class1', 'class2']);
	test.equal(perm1.checkPermission(requestPerm), requestPerm);
	
	// result className is sorted
	requestPerm = request(['class2', 'class1'], ['class1', 'class2'], ['class2', 'class1'])
	test.equal(perm1.checkPermission(requestPerm),
		request(['class1', 'class2'], ['class1', 'class2'], ['class1', 'class2']));
	
	// another user
	var perm2 = new Cadabia.Permission('user2');
	perm1.addGroupUser('class1', 'user2');
	
	// user2 in class1 group, class2 other role
	requestPerm = request(['class1'], ['class1'], ['class1']);
	test.equal(perm2.checkPermission(requestPerm), requestPerm);
	
	requestPerm = request(['class2'], ['class2'], ['class2']);
	test.equal(perm2.checkPermission(requestPerm),
		request(['class2'], null, ['class2']));
	
	requestPerm = request(['class1', 'class2'], ['class1', 'class2'], ['class1', 'class2']);
	test.equal(perm2.checkPermission(requestPerm),
		request(['class1', 'class2'], ['class1'], ['class1', 'class2']));
	
	requestPerm = request(['class2'], ['class1', 'class2'], ['class1']);
	test.equal(perm2.checkPermission(requestPerm),
		request(['class2'], ['class1'], ['class1']));
	
	// more other user
	var perm3 = new Cadabia.Permission('user3');
	perm1.addGroupUser('class2', 'user3');
	
	perm1.setPermission('class1', nToP('654'));
	perm1.setPermission('class2', nToP('321'));
	requestPerm = request(['class1', 'class2'], ['class1', 'class2'], ['class1', 'class2']);
	test.equal(perm1.checkPermission(requestPerm),
		request(['class1'], ['class1', 'class2'], ['class2']));
	test.equal(perm2.checkPermission(requestPerm),
		request(['class1'], null, ['class1', 'class2']));
	// user3 in class2 group, class1 other role
	test.equal(perm3.checkPermission(requestPerm),
		request(['class1'], ['class2'], null));
});

Tinytest.add('Permission - userExist', function (test) {
	test.isFalse(Cadabia.Permission.userExist('user'));
	test.isTrue(Cadabia.Permission.userExist('user1'));
	test.isTrue(Cadabia.Permission.userExist('user2'));
	
	test.isFalse(Cadabia.Permission.userExist('test'));
	test.isFalse(Cadabia.Permission.userExist('test1'));
	test.isFalse(Cadabia.Permission.userExist('test2'));
});

Tinytest.add('Permission - numberToPermission', function (test) {
	// test helper
	var nToP = Cadabia.Permission.numberToPermission;
	var perms = [
		{read : false, write : false, execute : false},
		{read : false, write : false, execute : true},
		{read : false, write : true, execute : false},
		{read : false, write : true, execute : true},
		{read : true, write : false, execute : false},
		{read : true, write : false, execute : true},
		{read : true, write : true, execute : false},
		{read : true, write : true, execute : true}
	];
	var perm = function (owner, group, other) {
		return {owner : perms[owner], group : perms[group], other : perms[other]};
	}
	var errorPerm = function (testInput) {
		try {
			nToP(testInput);
			test.isFalse(true, 'numberToPermission("' + testInput + '") should be fail');
		} catch (e) {
			test.isFalse(false);
		}
	}
	
	// simple tests
	test.equal(nToP('000'), perm(0, 0, 0));
	test.equal(nToP('123'), perm(1, 2, 3));
	test.equal(nToP('654'), perm(6, 5, 4));
	test.equal(nToP('777'), perm(7, 7, 7));
	
	/*
	// full tests from '000' to '777' octal
	for (i = 0; i <= 0777; i++) {
		// octal string
		var testString = i.toString(8);
		while (testString.length < 3) {
			testString = '0' + testString;
		}
		test.equal(
			nToP(testString),
			perm(parseInt(testString[0]),
				parseInt(testString[1]),
				parseInt(testString[2])),
			'nToP("' + testString + '")');
	}
	*/
	
	errorPerm(null);
	errorPerm('');
	errorPerm('0');
	errorPerm('12');
	errorPerm('1234');
	errorPerm('008');
	errorPerm('-123');
	errorPerm('1.23');
	errorPerm('a');
	errorPerm('abc');
	errorPerm([0, 1, 2]);
	errorPerm({k : 'v'});
});

Tinytest.add('Permission - teardown', function (test) {
	clearPermission();
});
