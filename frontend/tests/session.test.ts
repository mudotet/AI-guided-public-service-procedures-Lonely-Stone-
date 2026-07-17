import assert from "node:assert/strict";
import test from "node:test";

import { emptyRegistrationForm, flowStep, normaliseForm } from "../lib/session.ts";

test("normaliseForm luôn gửi boolean, không gửi chuỗi có/không", () => {
  const form = emptyRegistrationForm();
  form.parents_married = true;
  form.wants_father_on_certificate = true;
  form.parentage_evidence = true;
  form.has_foreign_documents = true;
  form.foreign_documents_translated = true;
  const payload = normaliseForm(form, ["out_of_wedlock", "foreign_element"]);

  assert.equal(payload.parents_married, true);
  assert.equal(payload.parentage_evidence, true);
  assert.equal(payload.foreign_documents_translated, true);
  assert.equal(payload.foreign_documents_legalized, false);
  assert.equal(flowStep("ready", "form", true), 3);
});
