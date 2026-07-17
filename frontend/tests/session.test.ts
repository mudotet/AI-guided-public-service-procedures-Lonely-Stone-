import assert from "node:assert/strict";
import test from "node:test";

import { emptyRegistrationForm, flowStep, mergeConversationFacts, normaliseForm } from "../lib/session.ts";

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

test("normaliseForm giữ thông tin cha cho case chuẩn và xóa khi không yêu cầu ghi cha", () => {
  const standard = emptyRegistrationForm();
  standard.father_full_name = "Nguyễn Văn Bình";
  standard.father_nationality = "Việt Nam";
  const standardPayload = normaliseForm(standard, ["standard"]);

  assert.equal(standardPayload.wants_father_on_certificate, true);
  assert.equal(standardPayload.father_full_name, "Nguyễn Văn Bình");

  const withoutFather = normaliseForm(standard, ["out_of_wedlock"]);
  assert.equal(withoutFather.wants_father_on_certificate, false);
  assert.equal(withoutFather.father_full_name, "");
  assert.equal(withoutFather.father_nationality, "");
});

test("dữ kiện từ hội thoại điền sẵn form nhưng không ghi đè ô người dùng đã sửa", () => {
  const form = emptyRegistrationForm();
  form.mother_full_name = "Tên người dùng đã sửa";
  const merged = mergeConversationFacts(
    form,
    { child_full_name: "Nguyễn An", parents_married: false, mother_full_name: "Tên từ AI", unknown: "bỏ qua" },
    new Set(["mother_full_name"]),
  );

  assert.equal(merged.child_full_name, "Nguyễn An");
  assert.equal(merged.parents_married, false);
  assert.equal(merged.mother_full_name, "Tên người dùng đã sửa");
  assert.equal("unknown" in merged, false);
});
