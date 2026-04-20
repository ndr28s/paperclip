import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShortcutEntry {
  keys: string[];
  labelKey: string;
}

interface ShortcutSection {
  titleKey: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    titleKey: "keyboardShortcuts.inbox",
    shortcuts: [
      { keys: ["j"], labelKey: "keyboardShortcuts.moveDown" },
      { keys: ["k"], labelKey: "keyboardShortcuts.moveUp" },
      { keys: ["Enter"], labelKey: "keyboardShortcuts.openSelected" },
      { keys: ["a"], labelKey: "keyboardShortcuts.archiveItem" },
      { keys: ["y"], labelKey: "keyboardShortcuts.archiveItem" },
      { keys: ["r"], labelKey: "keyboardShortcuts.markAsRead" },
      { keys: ["U"], labelKey: "keyboardShortcuts.markAsUnread" },
    ],
  },
  {
    titleKey: "keyboardShortcuts.issueDetail",
    shortcuts: [
      { keys: ["y"], labelKey: "keyboardShortcuts.quickArchive" },
      { keys: ["g", "i"], labelKey: "keyboardShortcuts.goToInbox" },
      { keys: ["g", "c"], labelKey: "keyboardShortcuts.focusComposer" },
    ],
  },
  {
    titleKey: "keyboardShortcuts.global",
    shortcuts: [
      { keys: ["/"], labelKey: "keyboardShortcuts.search" },
      { keys: ["c"], labelKey: "keyboardShortcuts.newIssue" },
      { keys: ["["], labelKey: "keyboardShortcuts.toggleSidebar" },
      { keys: ["]"], labelKey: "keyboardShortcuts.togglePanel" },
      { keys: ["?"], labelKey: "keyboardShortcuts.showShortcuts" },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-[0_1px_0_1px_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{t("keyboardShortcuts.title")}</DialogTitle>
        </DialogHeader>
        <div className="divide-y divide-border border-t border-border">
          {sections.map((section) => (
            <div key={section.titleKey} className="px-5 py-3">
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(section.titleKey)}
              </h3>
              <div className="space-y-1.5">
                {section.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.labelKey + shortcut.keys.join()}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-foreground/90">{t(shortcut.labelKey)}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={key} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-muted-foreground">then</span>}
                          <KeyCap>{key}</KeyCap>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {t("keyboardShortcuts.closeHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
