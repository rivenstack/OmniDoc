"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  SearchField,
  SearchFilterChips,
  SearchingNotice,
  type SearchFilterOption,
} from "@omnidoc/ui";
import {
  SEARCH_BASE_PATH,
  SEARCH_CORPUS_PARAM,
  SEARCH_QUERY_PARAM,
  searchHref,
  type SearchCorpus,
} from "../../lib/search/search-query";
import { pendingSearch } from "../../lib/search/search-navigation";
import { SearchFilterLink } from "./search-links";

/**
 * How long typing must pause before a search is committed to the URL.
 *
 * `docs/design/system-ux.md` §2 keeps as-you-type a *preference*, not a locked
 * contract, so the number is named here and not baked into the port.
 */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * The interactive half of `/search` (F-06).
 *
 * **State lives in the URL, and only the server answers.** Typing debounces into
 * `router.replace("/search?q=…")`; the page re-renders on the server and streams
 * the results region this component wraps. Nothing is searched in the browser:
 * the port is server-only (the API origin and the session cookies never reach the
 * client), and there is no client-side result cache to disagree with the server.
 *
 * Progressive enhancement is deliberate: the field is a real GET form, so Enter
 * and the search button work before hydration and with JavaScript off, and the
 * corpus filter survives that path as a hidden `corpus` field. With JavaScript,
 * submit and chips navigate through the router instead (`push`, so Back returns
 * to the previous search) and typing updates in place (`replace`, `scroll:false`,
 * so the reader is not thrown to the top of the page mid-keystroke).
 *
 * Focus and announcements: the field, the chips, and the results stay in the
 * document across a search, so focus is never lost; while a search is in flight
 * the form is `aria-busy` and `SearchingNotice` announces the wait once, and the
 * result count is announced by the results block when the answer arrives.
 */
export type SearchControlsProps = {
  /** The committed query from the URL. */
  query: string;
  /** The committed corpus filter from the URL (`null` = all). */
  corpus: SearchCorpus | null;
  /** The server-rendered results region. */
  children: ReactNode;
};

export function SearchControls({
  query: committedQuery,
  corpus,
  children,
}: SearchControlsProps) {
  const router = useRouter();
  const [query, setQuery] = useState(committedQuery);
  const [isPending, startTransition] = useTransition();
  // The last query this component pushed. A *different* prop means the URL moved
  // from the outside — Back/Forward, a filter chip, or a shared link — and the
  // field adopts it; the same value means our own navigation landed and the
  // reader's in-progress typing must not be clobbered.
  const pushed = useRef(committedQuery);

  useEffect(() => {
    if (committedQuery === pushed.current) {
      return;
    }
    pushed.current = committedQuery;
    setQuery(committedQuery);
  }, [committedQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      // `pendingSearch` is the tested decision: an unchanged (or whitespace-only)
      // draft is not a new search, so it never re-runs the same request.
      const pending = pendingSearch({
        committedQuery: pushed.current,
        draftQuery: query,
        corpus,
      });
      if (!pending) {
        return;
      }
      pushed.current = pending.query;
      startTransition(() => {
        router.replace(pending.href, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, corpus, router]);

  const trimmed = query.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // JavaScript is on: navigate in place so the filter and the debounced state
    // stay consistent. Without JavaScript this handler never runs and the form's
    // native GET action does the same thing.
    event.preventDefault();
    const pending = pendingSearch({
      committedQuery: pushed.current,
      draftQuery: query,
      corpus,
    });
    if (!pending) {
      return;
    }
    pushed.current = pending.query;
    startTransition(() => {
      router.push(pending.href);
    });
  }

  const filterOptions: SearchFilterOption[] = [
    {
      id: "all",
      label: "All",
      href: searchHref({ query: trimmed, corpus: null }),
      active: corpus === null,
    },
    {
      id: "mine",
      label: "Mine",
      href: searchHref({ query: trimmed, corpus: "mine" }),
      active: corpus === "mine",
    },
    {
      id: "sample",
      label: "Sample",
      href: searchHref({ query: trimmed, corpus: "sample" }),
      active: corpus === "sample",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SearchField
        value={query}
        onValueChange={setQuery}
        onSubmit={handleSubmit}
        action={SEARCH_BASE_PATH}
        name={SEARCH_QUERY_PARAM}
        busy={isPending}
        hiddenFields={
          corpus ? { [SEARCH_CORPUS_PARAM]: corpus } : undefined
        }
      />
      <SearchFilterChips
        options={filterOptions}
        linkComponent={SearchFilterLink}
      />
      {isPending && <SearchingNotice />}
      {/*
        `aria-busy` is on the region the answer lands in, so assistive tech knows
        the content is being replaced rather than final. The results themselves
        are rendered on the server and passed in as children.
      */}
      <div aria-busy={isPending}>{children}</div>
    </div>
  );
}
