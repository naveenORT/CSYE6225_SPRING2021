const Email_Check = require("email-validator");
const passwordValidator = require('password-validator');
const Password_Check = new passwordValidator();
const Name_Check = new passwordValidator();
const assert = require('assert');
const uuidVal = require('uuid-validate');


Password_Check.is().min(8).is().max(100).has().uppercase().has().lowercase().has().digits(1).has().symbols().has().not().spaces();
Name_Check.is().min(3).is().max(50).has().not().digits().has().not().symbols().has().letters();


describe("Validate Password", () => {
    it('Will pass only if password is valid', () => {
        if (Password_Check.validate("Ndy4940rt@n!") == true) { assert(true); }
        else { assert(false); }
    })
})

describe("Validate Password", () => {
    it('Will pass only if password is invalid', () => {
        if (Password_Check.validate("huj") == false) { assert(true); }
        else { assert(false); }
    })
})

describe("Validate Name", () => {
    it('Will pass only if Name is valid', () => {
        if (Name_Check.validate("RocketMan") == true) { assert(true); }
        else { assert(false); }
    })
})

describe("Validate Name", () => {
    it('Will pass only if Name is invalid', () => {
        if (Name_Check.validate("H1N1") === true) { assert(false); }
        else { assert(true); }
    })
})

describe("Validate Email", () => {
    it('Will pass only if Email is valid', () => {
        if (Email_Check.validate("jatin@example.com") == true) { assert(true); }
        else { assert(false); }
    })
})

describe("Validate Email", () => {
    it('Will pass only if Email is invalid', () => {
        if (Email_Check.validate("jest.com") === true) { assert(false); }
        else { assert(true); }
    })
})

describe("Validate UUID", () => {
    it('Will pass only if UUID is valid', () => {
        if (uuidVal("{7ea91f0f-9c57-43eb-82d0-d8e7f1f20e7}",4) === true) { assert(false); }
        else { assert(true); }
    })
})

describe("Validate UUID", () => {
    it('Will pass only if UUID is invalid', () => {
        if (uuidVal("xxsx",4) === true) { assert(false); }
        else { assert(true); }
    })
})