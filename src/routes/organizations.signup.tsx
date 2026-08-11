import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Logo } from "@/components/scale/Logo";
import { SiteFooter } from "@/components/scale/SiteFooter";
import { toast } from "sonner";
import {
  getOrgPricingSummary,
  ONE_BY_ONE_ENTRY_CAP,
  requiresFileUpload,
} from "@/lib/organizations/seat-pricing";
import { parseRosterFile, type RosterRow } from "@/lib/organizations/roster-file-parsing";

export const Route = createFileRoute("/organizations/signup")({
  head: () => ({
    meta: [
      { title: "Get Your Whole Team Fully Resourced — Fully Resourced Leadership System" },
      {
        name: "description",
        content:
          "Add your team, manage them anytime, all from one place. Get your whole organization coached with the Fully Resourced Leadership System.",
      },
    ],
    links: [{ rel: "canonical", href: "https://app.getfullyresourced.com/organizations/signup" }],
  }),
  component: OrganizationSignupPage,
});

type Step = "org" | "count" | "method" | "entry" | "review";
type EntryMethod = "file" | "one-by-one";

interface OneByOneRow {
  fullName: string;
  email: string;
}

function emptyRow(): OneByOneRow {
  return { fullName: "", email: "" };
}

function OrganizationSignupPage() {
  const [step, setStep] = useState<Step>("org");

  const [orgName, setOrgName] = useState("");
  const [submitterFullName, setSubmitterFullName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [submitterPassword, setSubmitterPassword] = useState("");

  const [statedCount, setStatedCount] = useState("");
  const [entryMethod, setEntryMethod] = useState<EntryMethod | null>(null);

  const [oneByOneRows, setOneByOneRows] = useState<OneByOneRow[]>([emptyRow()]);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileRows, setFileRows] = useState<RosterRow[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileParsing, setFileParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validOneByOneRows = useMemo(
    () => oneByOneRows.filter((r) => r.fullName.trim() && r.email.trim()),
    [oneByOneRows],
  );

  const roster: RosterRow[] = entryMethod === "file" ? fileRows : validOneByOneRows;
  const pricing = useMemo(() => getOrgPricingSummary(roster.length), [roster.length]);

  function handleOrgSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitterPassword.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setStep("count");
  }

  function handleCountSubmit(e: FormEvent) {
    e.preventDefault();
    const count = Number(statedCount);
    if (!Number.isFinite(count) || count < 1) {
      toast.error("Enter how many people you're adding.");
      return;
    }
    if (requiresFileUpload(count)) {
      setEntryMethod("file");
      setStep("entry");
    } else {
      setStep("method");
    }
  }

  function chooseMethod(method: EntryMethod) {
    setEntryMethod(method);
    setStep("entry");
  }

  function updateRow(index: number, field: keyof OneByOneRow, value: string) {
    setOneByOneRows((rows) => rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setOneByOneRows((rows) => (rows.length >= ONE_BY_ONE_ENTRY_CAP ? rows : [...rows, emptyRow()]));
  }

  function removeRow(index: number) {
    setOneByOneRows((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  async function handleFileSelected(file: File) {
    setFileParsing(true);
    setFileName(file.name);
    try {
      const result = await parseRosterFile(file);
      setFileRows(result.rows);
      setFileErrors(result.errors);
      if (result.rows.length === 0) {
        toast.error("Couldn't find any valid rows in that file.");
      }
    } catch {
      setFileRows([]);
      setFileErrors(["Couldn't read that file. Please check the format and try again."]);
    } finally {
      setFileParsing(false);
    }
  }

  function handleEntryContinue() {
    if (roster.length === 0) {
      toast.error(
        entryMethod === "file"
          ? "Upload a file with at least one person."
          : "Add at least one person.",
      );
      return;
    }
    // Duplicate-email check within the roster being submitted.
    const seen = new Set<string>();
    const duplicate = roster.find((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
    if (duplicate) {
      toast.error(`"${duplicate.email}" appears more than once.`);
      return;
    }
    setStep("review");
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--fr-signin-gradient)" }}>
      <div className="flex flex-1 flex-col items-center px-4 py-12">
        <div className="w-full max-w-[640px]">
          <div className="mb-6 flex justify-center">
            <Logo className="h-10 w-auto" />
          </div>

          {step === "org" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                Get Your Whole Team Fully Resourced
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Add your team, manage them anytime, all from one place.
              </p>

              <form onSubmit={handleOrgSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization name</Label>
                  <Input
                    id="orgName"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitterFullName">Your full name</Label>
                  <Input
                    id="submitterFullName"
                    required
                    value={submitterFullName}
                    onChange={(e) => setSubmitterFullName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitterEmail">Your email</Label>
                  <Input
                    id="submitterEmail"
                    type="email"
                    required
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="submitterPassword">Set a password</Label>
                  <Input
                    id="submitterPassword"
                    type="password"
                    required
                    minLength={8}
                    value={submitterPassword}
                    onChange={(e) => setSubmitterPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <p className="text-xs text-muted-foreground">
                    At least 8 characters. You'll use this to manage your team later.
                  </p>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  You're setting up access for your team, not for yourself — this account manages
                  the roster and billing, not assessments.
                </p>
                <Button
                  type="submit"
                  className="w-full bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                >
                  Continue
                </Button>
              </form>
            </Card>
          )}

          {step === "count" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                How many people are you adding?
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                This just decides how you'll enter your team — you'll be billed on the final list,
                even if it ends up different from this number.
              </p>
              <form onSubmit={handleCountSubmit} className="mt-8 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="statedCount">Number of people</Label>
                  <Input
                    id="statedCount"
                    type="number"
                    min={1}
                    required
                    value={statedCount}
                    onChange={(e) => setStatedCount(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep("org")}>
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  >
                    Continue
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {step === "method" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                How do you want to add your team?
              </h1>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => chooseMethod("file")}
                  className="rounded-xl border border-border p-6 text-left transition hover:border-rl-purple-cta hover:shadow-md"
                >
                  <div className="font-display text-lg font-semibold text-foreground">
                    Upload a file
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    CSV or Excel with each person's full name and email.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => chooseMethod("one-by-one")}
                  className="rounded-xl border border-border p-6 text-left transition hover:border-rl-purple-cta hover:shadow-md"
                >
                  <div className="font-display text-lg font-semibold text-foreground">
                    Add people one by one
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Type in each name and email, up to {ONE_BY_ONE_ENTRY_CAP} people.
                  </p>
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={() => setStep("count")}
              >
                Back
              </Button>
            </Card>
          )}

          {step === "entry" && entryMethod === "file" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                Upload your team
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                A CSV or Excel file with a "name" column and an "email" column.
              </p>

              <div className="mt-8 space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFileSelected(file);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileName ? "Choose a different file" : "Choose file"}
                </Button>
                {fileName && (
                  <p className="text-sm text-muted-foreground">
                    {fileParsing ? "Reading " : "Read "}
                    <span className="font-medium text-foreground">{fileName}</span>
                    {!fileParsing &&
                      ` — found ${fileRows.length} ${fileRows.length === 1 ? "person" : "people"}.`}
                  </p>
                )}
                {fileErrors.length > 0 && (
                  <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {fileErrors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(statedCountAllowsMethod(statedCount) ? "method" : "count")}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  onClick={handleEntryContinue}
                >
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === "entry" && entryMethod === "one-by-one" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                Add your team
              </h1>
              <div className="mt-8 space-y-3">
                {oneByOneRows.map((row, index) => (
                  <div key={index} className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      {index === 0 && <Label>Name</Label>}
                      <Input
                        value={row.fullName}
                        onChange={(e) => updateRow(index, "fullName", e.target.value)}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      {index === 0 && <Label>Email</Label>}
                      <Input
                        type="email"
                        value={row.email}
                        onChange={(e) => updateRow(index, "email", e.target.value)}
                        placeholder="email@company.com"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-muted-foreground"
                      disabled={oneByOneRows.length <= 1}
                      onClick={() => removeRow(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addRow}
                  disabled={oneByOneRows.length >= ONE_BY_ONE_ENTRY_CAP}
                >
                  Add new user
                </Button>
                {oneByOneRows.length >= ONE_BY_ONE_ENTRY_CAP && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    To add more than {ONE_BY_ONE_ENTRY_CAP} people, upload a CSV or Excel file with
                    each person's full name and email.
                  </p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("method")}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  onClick={handleEntryContinue}
                >
                  Continue
                </Button>
              </div>
            </Card>
          )}

          {step === "review" && (
            <Card className="rounded-2xl p-8 shadow-xl sm:p-10">
              <h1 className="text-center font-display text-2xl font-semibold text-foreground">
                Review your team
              </h1>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                {orgName} · {roster.length} {roster.length === 1 ? "person" : "people"}
              </p>

              <div className="mt-6 max-h-80 overflow-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.fullName}</TableCell>
                        <TableCell>{r.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per seat</span>
                  <span className="font-medium text-foreground">
                    ${(pricing.seatPriceCents / 100).toFixed(0)}/mo
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Total ({pricing.memberCount} seats)</span>
                  <span className="font-semibold text-foreground">
                    ${(pricing.totalCents / 100).toFixed(0)}/mo
                  </span>
                </div>
                {pricing.tier === "discounted" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    16+ people unlocks $87/seat for your whole team.
                  </p>
                )}
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" onClick={() => setStep("entry")}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-rl-purple-cta text-white hover:bg-rl-purple-cta/90"
                  onClick={() =>
                    toast.message("Payment isn't wired up yet — that's coming in the next update.")
                  }
                >
                  Continue to payment
                </Button>
              </div>
            </Card>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Signing up for yourself instead?{" "}
            <Link to="/signup" className="font-medium text-rl-purple-cta hover:underline">
              Individual signup
            </Link>
          </p>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

function statedCountAllowsMethod(statedCount: string): boolean {
  const count = Number(statedCount);
  return Number.isFinite(count) && !requiresFileUpload(count);
}
