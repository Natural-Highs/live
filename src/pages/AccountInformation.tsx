import React, { useState } from "react";
import { BrandLogo } from '@/components/ui/brand-logo';
import GreenCard from "@/components/ui/GreenCard";
import GuestTitleCard from "@/components/ui/GuestTitleCard";
// import TitleCard from "@/components/ui/TitleCard";
import { PageContainer } from '@/components/ui/page-container';
import GrnButton from '@/components/ui/GrnButton';
import GreyButton from '@/components/ui/GreyButton';

type AccountInfoForm = {
  name: string;
  pronouns: string;
  email: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
  acudetoxCompleted: boolean;
};

const AccountInfoPage: React.FC = () => {
  // TODO: replace initial values with data from Firebase
  const [form, setForm] = useState<AccountInfoForm>({
    name: "Holly Melohn",
    pronouns: "She/her",
    email: "holly@gmail.com",
    emergencyContactName: "Momma Melohn",
    emergencyContactNumber: "333-333-3333",
    acudetoxCompleted: true,
  });

  const handleChange =
    (field: keyof AccountInfoForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, acudetoxCompleted: e.target.checked }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: send `form` to backend / Firestore
    console.log("Save account info:", form);
  };

  return (
    <PageContainer>
    <div className="min-h-screen flex justify-center items-start bg-[#E9FBE7] py-6">
        {/* top bar text*/}
        {/* <header className="text-left text-base font-semibold mb-2 text-[#2f2f2f]">
          Account information
        </header> */}

        {/* main card area */}
        <div className="bg-[#E9FBE7] rounded-2xl">
          {/* logo area */}
          <div className="flex flex-col items-center mb-4 mt-1">
            <div className="mt-1">
              <BrandLogo
                size="lg"
                direction="vertical"
                showTitle={true}
                titleClassName="font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]"
                titlePosition="above"
                gapClassName="gap-0"
                titleSpacing={-55}
              />
            </div>
          </div>

          {/* <TitleCard>
        <h1>Account Information</h1>
      </TitleCard> */}

          {/* green card */}
          <GuestTitleCard className="text-center py-2">
           <h2 className="text-lg font-serif text-white">
             .
           </h2>
         </GuestTitleCard>

          <GreenCard showDivider={false} className="pt-0">
  <form onSubmit={handleSave} className="px-3 pb-4 pt-0">
              {/* Name */}
              <div className="mb-3">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  className="w-full rounded-md border border-[#4b5a3b] px-3 py-2 text-center text-lg font-serif bg-white focus:outline-none focus:ring-2 focus:ring-[#345b36]"
                />
              </div>

              {/* pronouns */}
              <div className="mb-3">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Pronouns
                </label>
                <input
                  type="text"
                  value={form.pronouns}
                  onChange={handleChange("pronouns")}
                  className="w-full rounded-md border border-[#4b5a3b] px-3 py-2 text-center text-lg font-serif bg-white focus:outline-none focus:ring-2 focus:ring-[#345b36]"
                />
              </div>

              {/* email */}
              <div className="mb-3">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  className="w-full rounded-md border border-[#4b5a3b] px-3 py-2 text-center text-lg font-serif bg-white focus:outline-none focus:ring-2 focus:ring-[#345b36]"
                />
              </div>

              {/* emergency contact name */}
              <div className="mb-3">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={form.emergencyContactName}
                  onChange={handleChange("emergencyContactName")}
                  className="w-full rounded-md border border-[#4b5a3b] px-3 py-2 text-center text-lg font-serif bg-white focus:outline-none focus:ring-2 focus:ring-[#345b36]"
                />
              </div>

              {/* emergency contact number */}
              <div className="mb-3">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Emergency Contact Number
                </label>
                <input
                  type="tel"
                  value={form.emergencyContactNumber}
                  onChange={handleChange("emergencyContactNumber")}
                  className="w-full rounded-md border border-[#4b5a3b] px-3 py-2 text-center text-lg font-serif bg-white focus:outline-none focus:ring-2 focus:ring-[#345b36]"
                />
              </div>

              {/* acudetox completion */}
              <div className="mb-4">
                <label className="block text-lg font-serif mb-1 text-[#233118]">
                  Acudetox completion
                </label>
                <div className="inline-flex items-center border border-[#4b5a3b] rounded-md px-3 py-2 bg-white">
                  <input
                    id="acudetox"
                    type="checkbox"
                    checked={form.acudetoxCompleted}
                    onChange={handleCheckboxChange}
                    className="mr-2 h-5 w-5 accent-[#345b36]"
                  />
                  <span className="text-sm font-serif">
                    {form.acudetoxCompleted ? "Completed" : "Not completed"}
                  </span>
                </div>
              </div>

              {/*save button*/}
              <div className="mt-4 mb-3">
                {/* adjust props to whatever your Button expects*/}
                <GrnButton className="w-full rounded-full py-3 text-lg">
                  Save
                </GrnButton>
              </div>
            </form>
          </GreenCard>

          {/* home button*/}
          <div className="mt-4">
            <GreyButton
            //   variant="secondary" 
              className="w-full rounded-full py-3 text-lg bg-[#6b767b] text-white"
            >
              Home
            </GreyButton>
          </div>
        </div>
      </div>
      </PageContainer>
  );
};

export default AccountInfoPage;
