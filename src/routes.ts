import { createBasicRouter, KeyValueStore, Dataset } from "crawlee";
import * as cheerio from "cheerio";
import dotenv from 'dotenv';
dotenv.config();
//@ts-ignore
const cookie = process.env.COOKIE;
let dataset: Dataset;
export const publishHeaders = {
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Cookie": cookie,
  "Referer": "https://www.tujidao06.com/u/?action=gengxin",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36 Edg/112.0.1722.48",
  Authority: "www.tujidao06.com",
};
export const router = createBasicRouter();
export const getDataset = async () => {
  if (!dataset) {
    dataset = await Dataset.open('dateset');
  }
  return dataset
}
interface Result {
  createTime: string;
  organization: string;
  tags: string[];
  people: string;
  title: string;
  id: string;
  page: number;
  url: string;
}
router.addDefaultHandler(async ({ sendRequest, log, enqueueLinks }) => {
  log.info(`Handle Start URLs`);
  const res = await sendRequest({
    searchParams: {
      action: "gengxin",
      page: 1,
    },
    headers: publishHeaders,
  });
  const $ = cheerio.load(res.body);
  // #pages > div > a:last-child
  const pageNumebr = Number(
    $("#pages > div > a:last-child").attr("href")?.split("page=")[1] || 0
  );
  const urls = Array(...Array(pageNumebr)).map((_, index) => {
    return `https://www.tujidao06.com/u/?action=gengxin&page=${index + 1}`;
  });
  await enqueueLinks({ urls, label: "Page" });
});

router.addHandler(
  "Page",
  async ({ sendRequest, log, request }) => {
    log.info(`Handle Start URLs ${request.url}`);
    const res = await sendRequest({
      headers: publishHeaders,
    });
    const $ = cheerio.load(res.body);
    const list = $(".hezi ul li");
    const results: Result[] = list.toArray().map((item) => {
      const createTime = $(item)
        .find('p:contains("收录")')
        .text()
        ?.split("：")[1];
      const organization = $(item)
        .find('p:contains("机构")')
        .text()
        .split("：")[1];
      const tags = $(item)
        .find('p:contains("标签") a')
        .toArray()
        .map((el) => {
          return $(el).text();
        });
      const url = $(item).find("a img").attr("src") || "";
      const people = $(item).find('p:contains("人物")').text()?.split("：")[1];
      const title = $(item).find("p.biaoti a").text();
      const id = $(item).find("p.biaoti a").attr("href")?.split("id=")[1] || "";
      const page = Number(
        $(item).find("span.shuliang").text()?.replace("P", "") || "0"
      );
      return {
        createTime,
        organization,
        tags,
        people,
        title,
        id,
        page,
        url,
      };
    });
    await Promise.all(
      results.map(async (item) => {
        const urls = Array(...Array(item.page)).map((_, index) => {
          const baseurl = item.url.split("0.jpg")[0];
          return `${baseurl}${index + 1}.jpg`;
        });
        await KeyValueStore.setValue(item.id, { ...item, urls });
        await (await getDataset()).pushData({ ...item, urls });
      })
    );
  }
);
router.addHandler("Download", async ({ sendRequest, log, request }) => {
  const url = request.url;
  const urlItem = url.split("/");
  const { id, title } = request.userData;
  const number = urlItem[urlItem.length - 1].split(".")[0];
  const res = await sendRequest({
    headers: publishHeaders,
  });
  log.info(`Download ${title} ${number} succes`);
  await KeyValueStore.setValue(`${id}_${number}`, res.rawBody, {
    contentType: res.headers["content-type"],
  });
});
