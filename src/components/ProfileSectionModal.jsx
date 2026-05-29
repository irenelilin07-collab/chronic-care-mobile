import { useEffect, useState } from "react";
import AllergyComboField from "./AllergyComboField.jsx";
import DiseaseComboField from "./DiseaseComboField.jsx";
import Modal from "./Modal.jsx";
import { GENDER_OPTIONS, RELATION_OPTIONS } from "../lib/profile.js";

const inputClass =
  "w-full rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-3 text-sm text-[#333] outline-none focus:border-[#00c896]";

const SECTION_TITLES = {
  basic: "基本信息",
  diseases: "确诊慢病",
  allergies: "药物过敏史",
  emergency: "紧急联系人",
};

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#e8faf4] px-3 py-1 text-sm text-[#00a87a]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-4 w-4 items-center justify-center rounded-full text-[#00a87a]/70"
        aria-label={`移除${label}`}
      >
        ×
      </button>
    </span>
  );
}

export default function ProfileSectionModal({ open, section, profile, onClose, onSave }) {
  const [form, setForm] = useState(profile);
  const [diseaseInput, setDiseaseInput] = useState("");
  const [allergyInput, setAllergyInput] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(profile);
    setDiseaseInput("");
    setAllergyInput("");
  }, [open, profile, section]);

  if (!open || !section) return null;

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateEmergency(field, value) {
    setForm((prev) => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value },
    }));
  }

  function addDisease(name) {
    const value = name.trim();
    if (!value) return;
    setForm((prev) => {
      const list = prev.chronicDiseases || [];
      if (list.includes(value)) return prev;
      return { ...prev, chronicDiseases: [...list, value] };
    });
    setDiseaseInput("");
  }

  function removeDisease(name) {
    setForm((prev) => ({
      ...prev,
      chronicDiseases: (prev.chronicDiseases || []).filter((item) => item !== name),
    }));
  }

  function addAllergy(name) {
    const value = name.trim();
    if (!value) return;
    setForm((prev) => {
      const list = prev.drugAllergies || [];
      if (list.includes(value)) return prev;
      return { ...prev, drugAllergies: [...list, value] };
    });
    setAllergyInput("");
  }

  function removeAllergy(name) {
    setForm((prev) => ({
      ...prev,
      drugAllergies: (prev.drugAllergies || []).filter((item) => item !== name),
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (section === "basic" && !form.nickname.trim()) {
      alert("请填写称呼");
      return;
    }
    if (section === "emergency" && form.emergencyContact.phone.trim()) {
      const phone = form.emergencyContact.phone.trim();
      if (!/^[\d+\-\s]{6,20}$/.test(phone)) {
        alert("请输入有效的联系电话");
        return;
      }
    }
    onSave(form);
  }

  function renderFields() {
    if (section === "basic") {
      return (
        <>
          <div>
            <label className="mb-1 block text-xs text-[#999]">称呼</label>
            <input
              className={inputClass}
              placeholder="如：王阿姨"
              value={form.nickname}
              onChange={(e) => update("nickname", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#999]">性别</label>
            <div className="grid grid-cols-3 gap-2">
              {GENDER_OPTIONS.map((opt) => {
                const active = form.gender === opt.key;
                return (
                  <button
                    key={opt.key || "none"}
                    type="button"
                    onClick={() => update("gender", opt.key)}
                    className={`min-h-[44px] rounded-xl text-sm font-medium ${
                      active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-[#999]">出生年份（可选）</label>
            <input
              className={inputClass}
              type="number"
              inputMode="numeric"
              placeholder="如：1958"
              min="1920"
              max={new Date().getFullYear()}
              value={form.birthYear}
              onChange={(e) => update("birthYear", e.target.value)}
            />
          </div>
        </>
      );
    }

    if (section === "diseases") {
      return (
        <>
          <p className="text-sm leading-6 text-[#999]">
            添加您已确诊的慢性病，方便后续管理和复诊记录。
          </p>
          {(form.chronicDiseases || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.chronicDiseases.map((name) => (
                <Chip key={name} label={name} onRemove={() => removeDisease(name)} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f8faf9] px-4 py-3 text-sm text-[#bbb]">暂未添加</p>
          )}
          <DiseaseComboField
            label="添加慢病"
            placeholder="搜索或输入，如：高血压"
            value={diseaseInput}
            onChange={setDiseaseInput}
            onPick={addDisease}
          />
        </>
      );
    }

    if (section === "allergies") {
      return (
        <>
          <p className="text-sm leading-6 text-[#999]">
            添加过敏药物或成分，便于日后提醒。
          </p>
          {(form.drugAllergies || []).length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {form.drugAllergies.map((name) => (
                <Chip key={name} label={name} onRemove={() => removeAllergy(name)} />
              ))}
            </div>
          ) : (
            <p className="rounded-xl bg-[#f8faf9] px-4 py-3 text-sm text-[#bbb]">暂未添加</p>
          )}
          <AllergyComboField
            label="添加过敏项"
            placeholder="搜索或输入，如：青霉素"
            value={allergyInput}
            onChange={setAllergyInput}
            onPick={addAllergy}
          />
        </>
      );
    }

    return (
      <>
        <div>
          <label className="mb-1 block text-xs text-[#999]">联系人姓名</label>
          <input
            className={inputClass}
            placeholder="如：李小明"
            value={form.emergencyContact.name}
            onChange={(e) => updateEmergency("name", e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#999]">与您的关系</label>
          <div className="grid grid-cols-3 gap-2">
            {RELATION_OPTIONS.map((label) => {
              const active = form.emergencyContact.relation === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => updateEmergency("relation", label)}
                  className={`min-h-[44px] rounded-xl text-sm font-medium ${
                    active ? "bg-[#00c896] text-white" : "bg-[#f5f6f8] text-[#666]"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-[#999]">联系电话</label>
          <input
            className={inputClass}
            type="tel"
            inputMode="tel"
            placeholder="如：13800001234"
            value={form.emergencyContact.phone}
            onChange={(e) => updateEmergency("phone", e.target.value)}
          />
        </div>
      </>
    );
  }

  return (
    <Modal title={SECTION_TITLES[section]} onClose={onClose}>
      <form noValidate onSubmit={handleSubmit} className="space-y-3">
        {renderFields()}
        <button
          type="submit"
          className="mt-2 w-full rounded-xl bg-[#00c896] py-3.5 text-sm font-semibold text-white"
        >
          保存
        </button>
      </form>
    </Modal>
  );
}
