import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeftPanel } from "../LeftPanel";
import { InheritanceProvider } from "../../context/InheritanceContext";

// Mock the components that use canvas/complex rendering
vi.mock("../PersonEditor", () => ({
  PersonEditor: () => <div data-testid="mock-person-editor">編輯繼承人</div>
}));

describe("LeftPanel", () => {
  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <InheritanceProvider>
        {ui}
      </InheritanceProvider>
    );
  };

  it("renders section headers", () => {
    renderWithContext(<LeftPanel open={true} onClose={vi.fn()} />);
    
    // Default tab is settings
    expect(screen.getByText("被繼承人資訊")).toBeInTheDocument();
    expect(screen.getByText("新增繼承人")).toBeInTheDocument();
    
    // Switch to results tab to see calculations
    fireEvent.click(screen.getByText("結果"));
    expect(screen.getByText("計算結果")).toBeInTheDocument();
  });

  it("adds a heir when button is clicked", () => {
    const onClose = vi.fn();
    renderWithContext(<LeftPanel open={true} onClose={onClose} />);
    
    // Add child
    fireEvent.click(screen.getByRole("button", { name: "+ 子女" }));
    
    // Switch back to edit tab if it was not auto-switched
    fireEvent.click(screen.getByText("編輯"));
    expect(screen.getByTestId("mock-person-editor")).toBeInTheDocument();
  });

  it("disables spouse button when spouse exists", () => {
    renderWithContext(<LeftPanel open={true} onClose={vi.fn()} />);
    
    const spouseBtn = screen.getByRole("button", { name: "+ 配偶" });
    expect(spouseBtn).not.toBeDisabled();
    
    fireEvent.click(spouseBtn);
    
    // Switch back to Settings to check the button
    fireEvent.click(screen.getByText("設定"));
    
    // After adding spouse, the button should be disabled
    expect(screen.getByRole("button", { name: "+ 配偶" })).toBeDisabled();
  });

  it("loads a preset", () => {
    renderWithContext(<LeftPanel open={true} onClose={vi.fn()} />);
    
    // Load first preset
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "0" } });
    
    // Switch to results tab to check
    fireEvent.click(screen.getByText("結果"));
    
    // After loading preset, results should appear (multiple heirs have shares)
    const shares = screen.getAllByText(/應繼分：/);
    expect(shares.length).toBeGreaterThan(0);
  });

  it("shows preset description after selection", () => {
    renderWithContext(<LeftPanel open={true} onClose={vi.fn()} />);
    
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "0" } });
    
    expect(screen.getByText(/最常見的繼承情形/)).toBeInTheDocument();
  });
});
