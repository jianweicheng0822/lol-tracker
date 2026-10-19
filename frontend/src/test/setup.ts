import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// The full suite runs ~40 files in parallel, and under that load a mocked fetch can take longer
// than findBy/waitFor's default 1s to show up, failing tests at random. Passing tests don't
// wait any longer: these return as soon as the element appears.
configure({ asyncUtilTimeout: 5000 });
