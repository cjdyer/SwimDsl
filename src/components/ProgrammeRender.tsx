import React from "react";

import { processSefJson, transformXml } from "../logic/xslTransformation";

interface ProgrammeRenderProps {
  xmlString: string;
  htmlStringRef: React.RefObject<string>;
  nodeRef: React.RefObject<HTMLIFrameElement | null>;
}

/**
 * The ProgrammeRender component is a SidePanel page which renders the HTML
 * generated from the current SwimDSL document.
 *
 * @param xmlString The swiML XML which should be rendered.
 *
 * @returns A React element used to render the generated HTML.
 */
function ProgrammeRender({
  xmlString,
  htmlStringRef,
  nodeRef,
}: ProgrammeRenderProps): React.ReactElement {
  const [sefData, setSefData] = React.useState({});
  const [htmlString, setHtmlString] = React.useState(() => htmlStringRef.current);
  const latestTransformId = React.useRef(0);

  const publishHtml = React.useCallback(
    (html: string) => {
      htmlStringRef.current = html;
      setHtmlString(html);
    },
    [htmlStringRef],
  );

  React.useEffect(() => {
    fetch("./swiML.sef.json")
      .then((response) => response.text())
      .then(processSefJson)
      .then(setSefData)
      .catch(console.error);
  }, []);

  React.useEffect(() => {
    if (Object.keys(sefData).length === 0) return;
    const transformId = latestTransformId.current + 1;
    latestTransformId.current = transformId;

    const timeoutId = window.setTimeout(() => {
      transformXml(xmlString, sefData)
        .then((html: string): string =>
          // INFO: The following call only replaces the first instance of the
          // search string. While this is sufficient for this usecase, it would be
          // nice to provide further guarantee. ES2021 introduced
          // String.replaceAll, which would provide this guarantee.
          // TODO: Look into using `replaceAll`.
          html.replace(
            "https://bartneck.github.io/swiML/swiML.css",
            "./swiML.css",
          ),
        )
        .then((html: string) => {
          if (transformId !== latestTransformId.current) return;

          publishHtml(html);
        })
        .catch((error: unknown) => {
          if (transformId !== latestTransformId.current) return;

          console.error(error);
        });
    }, 150);

    return () => {
      window.clearTimeout(timeoutId);
      latestTransformId.current += 1;
    };
  }, [publishHtml, sefData, xmlString]);

  return (
    <iframe
      ref={nodeRef}
      width="100%"
      height="100%"
      style={{ border: "none" }}
      srcDoc={htmlString}
    />
  );
}

export default ProgrammeRender;
